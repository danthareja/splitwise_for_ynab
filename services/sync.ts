import * as Sentry from "@sentry/nextjs";
import type { SyncedItem } from "@/prisma/generated/client";
import { prisma } from "@/db";
import { stripEmojis } from "@/lib/utils";
import { YNABError } from "./ynab-axios";
import { SplitwiseError } from "./splitwise-axios";
import { SyncStateFactory } from "./sync-state";
import { YNABService } from "./ynab";
import { SplitwiseService } from "./splitwise";
import { processLatestExpenses, processLatestTransactions } from "./glue";
import type { YNABTransaction } from "@/types/ynab";
import type { SplitwiseExpense } from "@/types/splitwise";
import {
  sendSyncPartialEmail,
  sendSyncErrorEmail,
  sendSyncErrorRequiresActionEmail,
  sendFirstSyncSuccessEmail,
} from "./email";
import { getUserFirstName } from "@/lib/utils";

// Helper type for effective Splitwise settings
interface EffectiveSplitwiseSettings {
  groupId: string;
  groupName: string | null;
  currencyCode: string;
  emoji: string;
  defaultSplitRatio: string;
  useDescriptionAsPayee: boolean;
  customPayeeName: string | null;
}

// Get effective Splitwise settings for a user (checks for primary/secondary relationship)
// Shared settings (groupId, groupName, currencyCode) come from primary
// User-specific settings (emoji, useDescriptionAsPayee, customPayeeName, defaultSplitRatio) come from user's own settings
// Note: defaultSplitRatio is user-specific because it's REVERSED for secondary users
// (e.g., if primary has 7:3, secondary has 3:7 stored in their own settings)
async function getEffectiveSplitwiseSettings(
  userId: string,
): Promise<EffectiveSplitwiseSettings | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      splitwiseSettings: true,
      primaryUser: {
        include: {
          splitwiseSettings: true,
        },
      },
    },
  });

  if (!user) return null;

  // If user is a secondary, merge primary's shared settings with user's own settings
  if (user.primaryUserId && user.primaryUser?.splitwiseSettings) {
    const primarySettings = user.primaryUser.splitwiseSettings;
    const userSettings = user.splitwiseSettings;

    if (!primarySettings.groupId || !primarySettings.currencyCode) return null;

    return {
      // Shared settings from primary
      groupId: primarySettings.groupId,
      groupName: primarySettings.groupName,
      currencyCode: primarySettings.currencyCode,
      // User-specific settings from secondary's own settings
      // defaultSplitRatio uses secondary's own reversed ratio (not primary's)
      defaultSplitRatio: userSettings?.defaultSplitRatio || "1:1",
      emoji: userSettings?.emoji || "✅",
      useDescriptionAsPayee: userSettings?.useDescriptionAsPayee ?? true,
      customPayeeName: userSettings?.customPayeeName || null,
    };
  }

  // Otherwise use user's own settings
  if (user.splitwiseSettings) {
    const ss = user.splitwiseSettings;
    if (!ss.groupId || !ss.currencyCode) return null;
    return {
      groupId: ss.groupId,
      groupName: ss.groupName,
      currencyCode: ss.currencyCode,
      emoji: ss.emoji || "✅",
      defaultSplitRatio: ss.defaultSplitRatio || "1:1",
      useDescriptionAsPayee: ss.useDescriptionAsPayee ?? true,
      customPayeeName: ss.customPayeeName,
    };
  }

  return null;
}

interface SyncResult {
  success: boolean;
  syncHistoryId?: string;
  error?: string;
  syncedTransactions?: SyncedItem[];
  syncedExpenses?: SyncedItem[];
}

interface PairedGroup {
  groupId: string;
  users: Array<{
    id: string;
    email: string | null;
  }>;
}

export async function syncAllUsers(): Promise<{
  totalUsers: number;
  successCount: number;
  errorCount: number;
  results: Record<string, SyncResult>;
}> {
  // Find all fully configured, enabled users with active subscriptions
  // Includes both:
  // - Primary users with their own SplitwiseSettings AND active subscription
  // - Secondary users who inherit from their primaryUser (subscription checked via primary)
  const configuredUsers = await prisma.user.findMany({
    where: {
      disabled: false,
      ynabSettings: {
        splitwiseAccountId: {
          not: null,
        },
      },
      OR: [
        // Primary/Solo users with their own SplitwiseSettings AND (active subscription OR grandfathered)
        {
          primaryUserId: null,
          splitwiseSettings: {
            groupId: { not: null },
            currencyCode: { not: null },
          },
          OR: [
            { subscriptionStatus: { in: ["active", "trialing"] } },
            { isGrandfathered: true },
          ],
        },
        // Secondary users - check primary's subscription status OR grandfathered
        {
          primaryUserId: { not: null },
          primaryUser: {
            disabled: false,
            splitwiseSettings: {
              groupId: { not: null },
              currencyCode: { not: null },
            },
            OR: [
              { subscriptionStatus: { in: ["active", "trialing"] } },
              { isGrandfathered: true },
            ],
          },
        },
      ],
    },
    select: {
      id: true,
      email: true,
      primaryUserId: true,
      splitwiseSettings: {
        select: {
          groupId: true,
        },
      },
      primaryUser: {
        select: {
          splitwiseSettings: {
            select: {
              groupId: true,
            },
          },
        },
      },
    },
  });

  console.log(`Found ${configuredUsers.length} configured users to sync`);

  // Group users by Splitwise group
  // Use effective groupId (from primary if secondary user)
  const groupMap = new Map<string, PairedGroup>();
  const singleUsers: Array<{ id: string; email: string | null }> = [];

  for (const user of configuredUsers) {
    // Get effective groupId - from primary if secondary, otherwise own settings
    const groupId = user.primaryUserId
      ? user.primaryUser?.splitwiseSettings?.groupId
      : user.splitwiseSettings?.groupId;

    if (groupId) {
      if (!groupMap.has(groupId)) {
        groupMap.set(groupId, {
          groupId,
          users: [],
        });
      }
      groupMap.get(groupId)!.users.push({
        id: user.id,
        email: user.email,
      });
    } else {
      singleUsers.push({
        id: user.id,
        email: user.email,
      });
    }
  }

  // Separate paired groups from single users
  const pairedGroups: PairedGroup[] = [];
  for (const [, group] of groupMap) {
    if (group.users.length > 1) {
      pairedGroups.push(group);
    } else {
      // Single user in group, treat as individual
      singleUsers.push(...group.users);
    }
  }

  console.log(
    `Found ${pairedGroups.length} paired groups and ${singleUsers.length} single users`,
  );

  const results: Record<string, SyncResult> = {};
  let successCount = 0;
  let errorCount = 0;

  // Sync paired groups first (two-phase sync)
  for (const group of pairedGroups) {
    try {
      console.log(
        `Syncing paired group ${group.groupId} with ${group.users.length} users...`,
      );
      const groupResult = await syncPairedGroup(group);

      // Merge group results
      for (const [userId, result] of Object.entries(groupResult.results)) {
        results[userId] = result;
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
        }
      }
    } catch (error) {
      console.error(`Error syncing paired group ${group.groupId}:`, error);
      Sentry.captureException(error);

      // Mark all users in the group as failed
      for (const user of group.users) {
        results[user.id] = {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
        errorCount++;
      }
    }
  }

  // Sync single users (original logic)
  for (const user of singleUsers) {
    try {
      console.log(`Syncing single user ${user.email || user.id}...`);
      const result = await syncSingleUser(user.id);
      results[user.id] = result;

      if (result.success) {
        successCount++;
      } else {
        errorCount++;
      }
    } catch (error) {
      console.error(
        `Error syncing single user ${user.email || user.id}:`,
        error,
      );
      Sentry.captureException(error);
      results[user.id] = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
      errorCount++;
    }
  }

  return {
    totalUsers: configuredUsers.length,
    successCount,
    errorCount,
    results,
  };
}

export async function syncUserData(userId: string): Promise<SyncResult> {
  // Check if this user is part of a paired group
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      splitwiseSettings: true,
      primaryUser: {
        include: {
          splitwiseSettings: true,
        },
      },
    },
  });

  // Guard: Do not sync disabled users
  if (user?.disabled) {
    console.log(`⏭️ Skipping sync for disabled user ${user.email || userId}`);
    return {
      success: false,
      error:
        user.disabledReason || "Account is disabled. Please re-enable to sync.",
    };
  }

  // Get effective groupId (from primary if secondary)
  const effectiveGroupId = user?.primaryUserId
    ? user?.primaryUser?.splitwiseSettings?.groupId
    : user?.splitwiseSettings?.groupId;

  if (effectiveGroupId) {
    // Check if there are other users in the same group
    // Include both primary users with this groupId and secondary users linked to primaries with this groupId
    const groupUsers = await prisma.user.findMany({
      where: {
        disabled: false, // Only include enabled users
        OR: [
          // Primary users with this group
          {
            primaryUserId: null,
            splitwiseSettings: { groupId: effectiveGroupId },
            ynabSettings: { splitwiseAccountId: { not: null } },
          },
          // Secondary users whose primary has this group
          {
            primaryUserId: { not: null },
            primaryUser: {
              splitwiseSettings: { groupId: effectiveGroupId },
            },
            ynabSettings: { splitwiseAccountId: { not: null } },
          },
        ],
      },
      select: {
        id: true,
        email: true,
      },
    });

    // If this user is part of a paired group (more than 1 user),
    // sync the entire group together
    if (groupUsers.length > 1) {
      const groupResults = await syncPairedGroup({
        groupId: effectiveGroupId,
        users: groupUsers,
      });

      // Return the result for this specific user
      return (
        groupResults.results[userId] || {
          success: false,
          error: "User not found in group sync results",
        }
      );
    }
  }

  // Single user sync (original logic)
  return await syncSingleUser(userId);
}

async function syncSingleUser(userId: string): Promise<SyncResult> {
  console.log(`🔄 Starting single user sync for user: ${userId}`);

  // Create a sync history record
  const syncHistory = await prisma.syncHistory.create({
    data: {
      userId,
      status: "pending",
    },
  });

  console.log(`📊 Created sync history record: ${syncHistory.id}`);

  try {
    // Check if user has both YNAB and Splitwise configured
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ynabSettings: true,
        splitwiseSettings: true,
        accounts: true,
        primaryUser: true, // For secondary users, check primary's status
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Guard: Do not sync disabled users
    if (user.disabled) {
      throw new Error(
        user.disabledReason || "Account is disabled. Please re-enable to sync.",
      );
    }

    if (!user.ynabSettings) {
      throw new Error("User has not configured YNAB settings");
    }

    if (!user.ynabSettings.splitwiseAccountId) {
      throw new Error("Splitwise account not configured in YNAB settings");
    }

    // Get effective Splitwise settings (from primary if secondary user)
    const effectiveSplitwiseSettings =
      await getEffectiveSplitwiseSettings(userId);

    if (!effectiveSplitwiseSettings) {
      // Check if this is a secondary with an orphaned primary
      if (user.primaryUserId && !user.primaryUser) {
        throw new Error(
          "Your partner's account is no longer active. Please reconfigure your settings.",
        );
      }
      throw new Error("Splitwise settings not configured");
    }

    const ynabAccount = user.accounts.find(
      (account) => account.provider === "ynab",
    );
    const splitwiseAccount = user.accounts.find(
      (account) => account.provider === "splitwise",
    );

    if (!ynabAccount?.access_token) {
      throw new Error("YNAB account not found or missing access token");
    }

    if (
      !splitwiseAccount?.access_token ||
      !splitwiseAccount?.providerAccountId
    ) {
      throw new Error(
        "Splitwise account not found or missing access token/provider ID",
      );
    }

    const syncState = await SyncStateFactory.create("prisma");

    const ynabService = new YNABService({
      userId: user.id,
      budgetId: user.ynabSettings.budgetId,
      splitwiseAccountId: user.ynabSettings.splitwiseAccountId,
      apiKey: ynabAccount.access_token,
      manualFlagColor: user.ynabSettings.manualFlagColor,
      syncedFlagColor: user.ynabSettings.syncedFlagColor,
      syncState,
    });

    // Use effective Splitwise settings (from primary if this is a secondary user)
    const splitwiseService = new SplitwiseService({
      userId: user.id,
      knownEmoji: effectiveSplitwiseSettings.emoji,
      splitwiseUserId: Number(splitwiseAccount.providerAccountId),
      groupId: effectiveSplitwiseSettings.groupId,
      currencyCode: effectiveSplitwiseSettings.currencyCode,
      apiKey: splitwiseAccount.access_token,
      syncState,
      defaultSplitRatio: effectiveSplitwiseSettings.defaultSplitRatio,
      useDescriptionAsPayee: effectiveSplitwiseSettings.useDescriptionAsPayee,
      customPayeeName:
        effectiveSplitwiseSettings.customPayeeName ||
        `Splitwise: ${effectiveSplitwiseSettings.groupName}` ||
        "Splitwise for YNAB",
    });

    // Process transactions from YNAB to Splitwise
    const { successful: successfulTransactions, failed: failedTransactions } =
      await processLatestTransactions(ynabService, splitwiseService);

    // Process expenses from Splitwise to YNAB
    const { successful: successfulExpenses, failed: failedExpenses } =
      await processLatestExpenses(ynabService, splitwiseService);

    // Record successful transactions
    const createdTransactionItems =
      successfulTransactions.length > 0
        ? await Promise.all(
            successfulTransactions.map((transaction) => {
              return prisma.syncedItem.create({
                data: createSyncItemData(
                  syncHistory.id,
                  transaction,
                  "ynab_transaction",
                  "ynab_to_splitwise",
                  undefined,
                  "success",
                ),
              });
            }),
          )
        : [];

    // Record failed transactions
    const createdFailedTransactionItems =
      failedTransactions.length > 0
        ? await Promise.all(
            failedTransactions.map(({ transaction, error }) => {
              return prisma.syncedItem.create({
                data: createSyncItemData(
                  syncHistory.id,
                  transaction,
                  "ynab_transaction",
                  "ynab_to_splitwise",
                  undefined,
                  "error",
                  error.message,
                ),
              });
            }),
          )
        : [];

    // Record successful expenses
    const createdExpenseItems =
      successfulExpenses.length > 0
        ? await Promise.all(
            successfulExpenses.map((expense) => {
              return prisma.syncedItem.create({
                data: createSyncItemData(
                  syncHistory.id,
                  expense,
                  "splitwise_expense",
                  "splitwise_to_ynab",
                  splitwiseService,
                  "success",
                ),
              });
            }),
          )
        : [];

    // Record failed expenses
    const createdFailedExpenseItems =
      failedExpenses.length > 0
        ? await Promise.all(
            failedExpenses.map(({ expense, error }) => {
              return prisma.syncedItem.create({
                data: createSyncItemData(
                  syncHistory.id,
                  expense,
                  "splitwise_expense",
                  "splitwise_to_ynab",
                  splitwiseService,
                  "error",
                  error.message,
                ),
              });
            }),
          )
        : [];

    // Determine sync status
    const hasFailures =
      failedTransactions.length > 0 || failedExpenses.length > 0;
    const syncStatus = hasFailures ? "partial" : "success";

    // Update sync history
    await prisma.syncHistory.update({
      where: { id: syncHistory.id },
      data: {
        status: syncStatus,
        completedAt: new Date(),
      },
    });

    if (syncStatus === "partial") {
      await sendSyncPartialEmail({
        to: user.email || "support@splitwiseforynab.com",
        userName: getUserFirstName(user),
        failedExpenses: createdFailedExpenseItems,
        failedTransactions: createdFailedTransactionItems,
        currencyCode: effectiveSplitwiseSettings.currencyCode,
      });
    }

    // Check if this is the user's first successful sync
    const totalSynced =
      createdTransactionItems.filter((i) => i.status === "success").length +
      createdExpenseItems.filter((i) => i.status === "success").length;

    if (totalSynced > 0 && user.email) {
      const alreadySent = await prisma.emailSend.findFirst({
        where: { userId, emailKey: "sync.first-success" },
      });

      if (!alreadySent) {
        await prisma.emailSend.create({
          data: { userId, category: "sync", emailKey: "sync.first-success" },
        });
        sendFirstSyncSuccessEmail({
          to: user.email,
          userName: getUserFirstName(user),
          syncedCount: totalSynced,
        }).catch((err) =>
          console.error("Failed to send first sync success email:", err),
        );
      }
    }

    console.log(`🏆 Single user sync complete for ${user.email || user.id}:`);

    return {
      success: true,
      syncHistoryId: syncHistory.id,
      syncedTransactions: [
        ...createdTransactionItems,
        ...createdFailedTransactionItems,
      ],
      syncedExpenses: [...createdExpenseItems, ...createdFailedExpenseItems],
    };
  } catch (error) {
    if (
      (error instanceof YNABError && error.requires_action) ||
      (error instanceof SplitwiseError && error.requires_action)
    ) {
      console.log(
        `🚨 ${error instanceof YNABError ? "YNAB" : "Splitwise"} error requires action: ${error.message}`,
      );

      // Check if user is already disabled to avoid spamming emails
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      const wasAlreadyDisabled = existingUser?.disabled || false;

      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          disabled: true,
          disabledAt: new Date(),
          disabledReason: error.message,
          suggestedFix: error.suggestedFix,
        },
      });

      // Only send email if this is the first time we're disabling the account
      if (!wasAlreadyDisabled) {
        await sendSyncErrorRequiresActionEmail({
          to: user.email || "support@splitwiseforynab.com",
          userName: getUserFirstName(user),
          errorMessage: error.message,
          suggestedFix: error.suggestedFix || "Please contact support",
        });
      } else {
        console.log(
          `⏭️ User ${user.email || userId} already disabled - skipping duplicate email notification`,
        );
      }
    } else {
      console.error("Sync error:", error);
      Sentry.captureException(error);

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      await sendSyncErrorEmail({
        to: user?.email || "support@splitwiseforynab.com",
        userName: getUserFirstName(user),
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
    }

    // Update sync history with error
    await prisma.syncHistory.update({
      where: { id: syncHistory.id },
      data: {
        status: "error",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        completedAt: new Date(),
      },
    });

    return {
      success: false,
      syncHistoryId: syncHistory.id,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function syncPairedGroup(group: PairedGroup): Promise<{
  success: boolean;
  results: Record<string, SyncResult>;
}> {
  console.log(
    `🔄 Starting paired group sync - Group: ${group.groupId}, Users: ${group.users.length}`,
  );
  console.log(
    `👥 Group members: ${group.users.map((u) => u.email || u.id).join(", ")}`,
  );

  const results: Record<string, SyncResult> = {};

  try {
    // Phase 1: All users sync YNAB → Splitwise
    console.log(
      `\n🟡 === PHASE 1: YNAB → Splitwise for group ${group.groupId} ===`,
    );

    for (const user of group.users) {
      console.log(`\n👤 Phase 1 - Processing user: ${user.email || user.id}`);
      try {
        const result = await syncUserPhase(user.id, "ynab_to_splitwise");
        results[user.id] = result;

        const txnCount = result.syncedTransactions?.length || 0;
        console.log(
          `✅ Phase 1 complete for ${user.email || user.id}: ${txnCount} YNAB transactions processed`,
        );
      } catch (error) {
        console.error(
          `❌ Phase 1 error for user ${user.email || user.id}:`,
          error,
        );
        results[user.id] = {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }

    const phase1Summary = Object.values(results);
    const phase1Success = phase1Summary.filter((r) => r.success).length;
    const phase1TotalTxns = phase1Summary.reduce(
      (sum, r) => sum + (r.syncedTransactions?.length || 0),
      0,
    );
    console.log(
      `\n📊 Phase 1 Summary: ${phase1Success}/${group.users.length} users successful, ${phase1TotalTxns} total YNAB transactions processed`,
    );

    // Phase 2: All users sync Splitwise → YNAB
    console.log(
      `\n🟢 === PHASE 2: Splitwise → YNAB for group ${group.groupId} ===`,
    );

    for (const user of group.users) {
      console.log(`\n👤 Phase 2 - Processing user: ${user.email || user.id}`);
      try {
        const phase1Result = results[user.id];
        if (phase1Result && phase1Result.success) {
          const phase2Result = await syncUserPhase(
            user.id,
            "splitwise_to_ynab",
            phase1Result.syncHistoryId,
          );

          const expenseCount = phase2Result.syncedExpenses?.length || 0;
          console.log(
            `✅ Phase 2 complete for ${user.email || user.id}: ${expenseCount} Splitwise expenses processed`,
          );

          // Merge results
          results[user.id] = {
            success: phase2Result.success,
            syncHistoryId: phase1Result.syncHistoryId,
            error: phase2Result.error,
            syncedTransactions: phase1Result.syncedTransactions,
            syncedExpenses: phase2Result.syncedExpenses,
          };
        } else {
          console.log(
            `⚠️ Skipping Phase 2 for ${user.email || user.id} - Phase 1 failed`,
          );
        }
      } catch (error) {
        console.error(
          `❌ Phase 2 error for user ${user.email || user.id}:`,
          error,
        );
        const phase1Result = results[user.id];
        results[user.id] = {
          success: false,
          syncHistoryId: phase1Result?.syncHistoryId,
          error: error instanceof Error ? error.message : "Unknown error",
          syncedTransactions: phase1Result?.syncedTransactions,
        };
      }
    }

    const phase2Summary = Object.values(results);
    const phase2Success = phase2Summary.filter((r) => r.success).length;
    const phase2TotalExpenses = phase2Summary.reduce(
      (sum, r) => sum + (r.syncedExpenses?.length || 0),
      0,
    );
    console.log(
      `\n📊 Phase 2 Summary: ${phase2Success}/${group.users.length} users successful, ${phase2TotalExpenses} total Splitwise expenses processed`,
    );

    // Final summary
    const finalSummary = Object.values(results);
    const overallSuccess = finalSummary.every((r) => r.success);
    const totalTransactions = finalSummary.reduce(
      (sum, r) => sum + (r.syncedTransactions?.length || 0),
      0,
    );
    const totalExpenses = finalSummary.reduce(
      (sum, r) => sum + (r.syncedExpenses?.length || 0),
      0,
    );

    console.log(`\n🏆 === SYNC COMPLETE for group ${group.groupId} ===`);
    console.log(`📈 Overall Success: ${overallSuccess ? "✅ YES" : "❌ NO"}`);
    console.log(`📊 Total YNAB transactions processed: ${totalTransactions}`);
    console.log(`📊 Total Splitwise expenses processed: ${totalExpenses}`);
    console.log(`👥 Users processed: ${finalSummary.length}`);

    if (!overallSuccess) {
      const failedUsers = finalSummary.filter((r) => !r.success);
      console.log(`❌ Failed users: ${failedUsers.length}`);
      failedUsers.forEach((result, idx) => {
        const userId = Object.keys(results).find(
          (key) => results[key] === result,
        );
        const user = group.users.find((u) => u.id === userId);
        console.log(`   ${idx + 1}. ${user?.email || userId}: ${result.error}`);
      });
    }

    return {
      success: overallSuccess,
      results,
    };
  } catch (error) {
    console.error(`Error syncing paired group ${group.groupId}:`, error);
    Sentry.captureException(error);

    // Mark all users as failed if we haven't processed them yet
    for (const user of group.users) {
      if (!results[user.id]) {
        results[user.id] = {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }

    return {
      success: false,
      results,
    };
  }
}

async function syncUserPhase(
  userId: string,
  phase: "ynab_to_splitwise" | "splitwise_to_ynab",
  existingSyncHistoryId?: string,
): Promise<SyncResult> {
  // Create or use existing sync history record
  let syncHistory;
  if (existingSyncHistoryId) {
    syncHistory = await prisma.syncHistory.findUnique({
      where: { id: existingSyncHistoryId },
    });
    if (!syncHistory) {
      throw new Error("Existing sync history not found");
    }
  } else {
    syncHistory = await prisma.syncHistory.create({
      data: {
        userId,
        status: "pending",
      },
    });
  }

  try {
    // Get user configuration
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ynabSettings: true,
        splitwiseSettings: true,
        accounts: true,
        primaryUser: true, // For secondary users
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Guard: Do not sync disabled users
    if (user.disabled) {
      throw new Error(
        user.disabledReason || "Account is disabled. Please re-enable to sync.",
      );
    }

    if (!user.ynabSettings) {
      throw new Error("User has not configured YNAB settings");
    }

    if (!user.ynabSettings.splitwiseAccountId) {
      throw new Error("Splitwise account not configured in YNAB settings");
    }

    // Get effective Splitwise settings (from primary if secondary user)
    const effectiveSplitwiseSettings =
      await getEffectiveSplitwiseSettings(userId);

    if (!effectiveSplitwiseSettings) {
      if (user.primaryUserId && !user.primaryUser) {
        throw new Error(
          "Your partner's account is no longer active. Please reconfigure your settings.",
        );
      }
      throw new Error("Splitwise settings not configured");
    }

    const ynabAccount = user.accounts.find(
      (account) => account.provider === "ynab",
    );
    const splitwiseAccount = user.accounts.find(
      (account) => account.provider === "splitwise",
    );

    if (!ynabAccount?.access_token) {
      throw new Error("YNAB account not found or missing access token");
    }

    if (
      !splitwiseAccount?.access_token ||
      !splitwiseAccount?.providerAccountId
    ) {
      throw new Error(
        "Splitwise account not found or missing access token/provider ID",
      );
    }

    const syncState = await SyncStateFactory.create("prisma");

    const ynabService = new YNABService({
      userId: user.id,
      budgetId: user.ynabSettings.budgetId,
      splitwiseAccountId: user.ynabSettings.splitwiseAccountId,
      apiKey: ynabAccount.access_token,
      manualFlagColor: user.ynabSettings.manualFlagColor,
      syncedFlagColor: user.ynabSettings.syncedFlagColor,
      syncState,
    });

    // Use effective Splitwise settings (from primary if this is a secondary user)
    const splitwiseService = new SplitwiseService({
      userId: user.id,
      knownEmoji: effectiveSplitwiseSettings.emoji,
      splitwiseUserId: Number(splitwiseAccount.providerAccountId),
      groupId: effectiveSplitwiseSettings.groupId,
      currencyCode: effectiveSplitwiseSettings.currencyCode,
      apiKey: splitwiseAccount.access_token,
      syncState,
      defaultSplitRatio: effectiveSplitwiseSettings.defaultSplitRatio,
      useDescriptionAsPayee: effectiveSplitwiseSettings.useDescriptionAsPayee,
      customPayeeName:
        effectiveSplitwiseSettings.customPayeeName ||
        `Splitwise: ${effectiveSplitwiseSettings.groupName}` ||
        "Splitwise for YNAB",
    });

    let createdTransactionItems: SyncedItem[] = [];
    let createdExpenseItems: SyncedItem[] = [];

    console.log(`🔍 Starting ${phase} for user ${user.email || user.id}`);
    console.log(
      `📊 Config - YNAB Budget: ${user.ynabSettings.budgetId}, Splitwise Group: ${effectiveSplitwiseSettings.groupId}`,
    );

    if (phase === "ynab_to_splitwise") {
      console.log(`📤 Phase: YNAB → Splitwise`);

      // Process transactions from YNAB to Splitwise
      const { successful: successfulTransactions, failed: failedTransactions } =
        await processLatestTransactions(ynabService, splitwiseService);

      console.log(
        `📋 Found ${successfulTransactions.length + failedTransactions.length} YNAB transactions to process (${successfulTransactions.length} successful, ${failedTransactions.length} failed)`,
      );

      // Record successful transactions
      const successfulTransactionItems =
        successfulTransactions.length > 0
          ? await Promise.all(
              successfulTransactions.map((transaction) =>
                prisma.syncedItem.create({
                  data: createSyncItemData(
                    syncHistory.id,
                    transaction,
                    "ynab_transaction",
                    "ynab_to_splitwise",
                    undefined,
                    "success",
                  ),
                }),
              ),
            )
          : [];

      // Record failed transactions
      const failedTransactionItems =
        failedTransactions.length > 0
          ? await Promise.all(
              failedTransactions.map(({ transaction, error }) =>
                prisma.syncedItem.create({
                  data: createSyncItemData(
                    syncHistory.id,
                    transaction,
                    "ynab_transaction",
                    "ynab_to_splitwise",
                    undefined,
                    "error",
                    error.message,
                  ),
                }),
              ),
            )
          : [];

      createdTransactionItems = [
        ...successfulTransactionItems,
        ...failedTransactionItems,
      ];

      console.log(
        `✅ YNAB → Splitwise phase complete: ${createdTransactionItems.length} items recorded (${successfulTransactionItems.length} successful, ${failedTransactionItems.length} failed)`,
      );
    } else {
      console.log(`📥 Phase: Splitwise → YNAB`);

      // Process expenses from Splitwise to YNAB
      const { successful: successfulExpenses, failed: failedExpenses } =
        await processLatestExpenses(ynabService, splitwiseService);

      console.log(
        `📋 Found ${successfulExpenses.length + failedExpenses.length} Splitwise expenses to process (${successfulExpenses.length} successful, ${failedExpenses.length} failed)`,
      );

      // Record successful expenses
      const successfulExpenseItems =
        successfulExpenses.length > 0
          ? await Promise.all(
              successfulExpenses.map((expense) =>
                prisma.syncedItem.create({
                  data: createSyncItemData(
                    syncHistory.id,
                    expense,
                    "splitwise_expense",
                    "splitwise_to_ynab",
                    splitwiseService,
                    "success",
                  ),
                }),
              ),
            )
          : [];

      // Record failed expenses
      const failedExpenseItems =
        failedExpenses.length > 0
          ? await Promise.all(
              failedExpenses.map(({ expense, error }) =>
                prisma.syncedItem.create({
                  data: createSyncItemData(
                    syncHistory.id,
                    expense,
                    "splitwise_expense",
                    "splitwise_to_ynab",
                    splitwiseService,
                    "error",
                    error.message,
                  ),
                }),
              ),
            )
          : [];

      createdExpenseItems = [...successfulExpenseItems, ...failedExpenseItems];

      console.log(
        `✅ Splitwise → YNAB phase complete: ${createdExpenseItems.length} items recorded (${successfulExpenseItems.length} successful, ${failedExpenseItems.length} failed)`,
      );

      // Determine sync status for the final phase
      const createdFailedTransactionItems = createdTransactionItems.filter(
        (item) => item.status === "error",
      );
      const createdFailedExpenseItems = createdExpenseItems.filter(
        (item) => item.status === "error",
      );

      // Determine sync status
      const syncStatus =
        createdFailedTransactionItems.length > 0 ||
        createdFailedExpenseItems.length > 0
          ? "partial"
          : "success";

      // Update sync history to completed only after the final phase
      await prisma.syncHistory.update({
        where: { id: syncHistory.id },
        data: {
          status: syncStatus,
          completedAt: new Date(),
        },
      });

      if (syncStatus === "partial") {
        await sendSyncPartialEmail({
          to: user.email || "support@splitwiseforynab.com",
          userName: getUserFirstName(user),
          failedExpenses: createdFailedExpenseItems,
          failedTransactions: createdFailedTransactionItems,
          currencyCode: effectiveSplitwiseSettings.currencyCode,
        });
      }

      // Check if this is the user's first successful sync
      const totalSynced =
        createdTransactionItems.filter((i) => i.status === "success").length +
        createdExpenseItems.filter((i) => i.status === "success").length;

      if (totalSynced > 0 && user.email) {
        const alreadySent = await prisma.emailSend.findFirst({
          where: { userId, emailKey: "sync.first-success" },
        });

        if (!alreadySent) {
          await prisma.emailSend.create({
            data: {
              userId,
              category: "sync",
              emailKey: "sync.first-success",
            },
          });
          sendFirstSyncSuccessEmail({
            to: user.email,
            userName: getUserFirstName(user),
            syncedCount: totalSynced,
          }).catch((err) =>
            console.error("Failed to send first sync success email:", err),
          );
        }
      }
    }

    return {
      success: true,
      syncHistoryId: syncHistory.id,
      syncedTransactions: createdTransactionItems,
      syncedExpenses: createdExpenseItems,
    };
  } catch (error) {
    // Fetch user info for error notifications
    const errorUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (
      (error instanceof YNABError && error.requires_action) ||
      (error instanceof SplitwiseError && error.requires_action)
    ) {
      console.log(
        `🚨 ${error instanceof YNABError ? "YNAB" : "Splitwise"} error requires action: ${error.message}`,
      );

      // Check if user is already disabled to avoid spamming emails
      const wasAlreadyDisabled = errorUser?.disabled || false;

      await prisma.user.update({
        where: { id: userId },
        data: {
          disabled: true,
          disabledAt: new Date(),
          disabledReason: error.message,
          suggestedFix: error.suggestedFix,
        },
      });

      // Only send email if this is the first time we're disabling the account
      if (!wasAlreadyDisabled) {
        await sendSyncErrorRequiresActionEmail({
          to: errorUser?.email || "support@splitwiseforynab.com",
          userName: getUserFirstName(errorUser),
          errorMessage: error.message,
          suggestedFix: error.suggestedFix || "Please contact support",
        });
      } else {
        console.log(
          `⏭️ User ${errorUser?.email || userId} already disabled - skipping duplicate email notification`,
        );
      }
    } else {
      console.error(`Sync error for user ${userId}, phase ${phase}:`, error);
      Sentry.captureException(error);

      await sendSyncErrorEmail({
        to: errorUser?.email || "support@splitwiseforynab.com",
        userName: getUserFirstName(errorUser),
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
    }

    // Update sync history with error
    await prisma.syncHistory.update({
      where: { id: syncHistory.id },
      data: {
        status: "error",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        completedAt: new Date(),
      },
    });

    return {
      success: false,
      syncHistoryId: syncHistory.id,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Helper function to create sync item data
function createSyncItemData(
  syncHistoryId: string,
  item: YNABTransaction | SplitwiseExpense,
  type: "ynab_transaction" | "splitwise_expense",
  direction: "ynab_to_splitwise" | "splitwise_to_ynab",
  splitwiseService?: SplitwiseService,
  status: "success" | "error" = "success",
  errorMessage?: string,
) {
  const isTransaction = type === "ynab_transaction";
  const transaction = item as YNABTransaction;
  const expense = item as SplitwiseExpense;

  return {
    syncHistoryId,
    externalId: isTransaction ? transaction.id : expense.id.toString(),
    type,
    amount: isTransaction
      ? transaction.amount / 1000
      : splitwiseService!.toYNABAmount(expense) / 1000,
    description: isTransaction
      ? stripEmojis(
          transaction.payee_name || transaction.memo || "Unknown transaction",
        )
      : stripEmojis(expense.description || "Unknown expense"),
    date: isTransaction
      ? transaction.date!.split("T")[0] || transaction.date!
      : expense.date!.split("T")[0] || expense.date!,
    direction,
    status,
    errorMessage,
  };
}
