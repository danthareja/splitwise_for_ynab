import * as Sentry from "@sentry/nextjs";
import type { SyncedItem } from "@prisma/client";
import { prisma } from "@/db";
import { SyncStateFactory } from "./sync-state";
import { YNABService } from "./ynab";
import { SplitwiseService } from "./splitwise";
import { processLatestExpenses, processLatestTransactions } from "./glue";
import type { YNABTransaction } from "@/types/ynab";
import type { SplitwiseExpense } from "@/types/splitwise";

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
  // Find all fully configured users
  const configuredUsers = await prisma.user.findMany({
    where: {
      ynabSettings: {
        splitwiseAccountId: {
          not: null,
        },
      },
      splitwiseSettings: {
        groupId: {
          not: null,
        },
        currencyCode: {
          not: null,
        },
      },
    },
    select: {
      id: true,
      email: true,
      splitwiseSettings: {
        select: {
          groupId: true,
        },
      },
    },
  });

  console.log(`Found ${configuredUsers.length} configured users to sync`);

  // Group users by Splitwise group
  const groupMap = new Map<string, PairedGroup>();
  const singleUsers: Array<{ id: string; email: string | null }> = [];

  for (const user of configuredUsers) {
    const groupId = user.splitwiseSettings?.groupId;
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
    },
  });

  if (user?.splitwiseSettings?.groupId) {
    // Check if there are other users in the same group
    const groupUsers = await prisma.user.findMany({
      where: {
        splitwiseSettings: {
          groupId: user.splitwiseSettings.groupId,
        },
        ynabSettings: {
          splitwiseAccountId: {
            not: null,
          },
        },
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
        groupId: user.splitwiseSettings.groupId,
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
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (!user.ynabSettings || !user.splitwiseSettings) {
      throw new Error("User has not configured both YNAB and Splitwise");
    }

    if (!user.ynabSettings.splitwiseAccountId) {
      throw new Error("Splitwise account not configured in YNAB settings");
    }

    if (
      !user.splitwiseSettings.groupId ||
      !user.splitwiseSettings.currencyCode
    ) {
      throw new Error("Splitwise group or currency not configured");
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

    if (!user.splitwiseSettings.emoji) {
      throw new Error("Splitwise emoji not configured");
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

    const splitwiseService = new SplitwiseService({
      userId: user.id,
      knownEmoji: user.splitwiseSettings.emoji,
      splitwiseUserId: Number(splitwiseAccount.providerAccountId),
      groupId: user.splitwiseSettings.groupId,
      currencyCode: user.splitwiseSettings.currencyCode,
      apiKey: splitwiseAccount.access_token,
      syncState,
    });

    // Process transactions from YNAB to Splitwise
    const syncedTransactions: YNABTransaction[] =
      await processLatestTransactions(ynabService, splitwiseService);

    // Process expenses from Splitwise to YNAB
    const syncedExpenses: SplitwiseExpense[] = await processLatestExpenses(
      ynabService,
      splitwiseService,
    );

    // Record synced transactions
    const createdTransactionItems =
      syncedTransactions.length > 0
        ? await Promise.all(
            syncedTransactions.map((transaction) => {
              return prisma.syncedItem.create({
                data: {
                  syncHistoryId: syncHistory.id,
                  externalId: transaction.id,
                  type: "ynab_transaction",
                  amount: transaction.amount / 1000, // Convert from milliunits
                  description:
                    transaction.payee_name ||
                    transaction.memo ||
                    "Unknown transaction",
                  date: transaction.date!.split("T")[0] || transaction.date!,
                  direction: "ynab_to_splitwise",
                },
              });
            }),
          )
        : [];

    // Record synced expenses
    const createdExpenseItems =
      syncedExpenses.length > 0
        ? await Promise.all(
            syncedExpenses.map((expense) => {
              return prisma.syncedItem.create({
                data: {
                  syncHistoryId: syncHistory.id,
                  externalId: expense.id.toString(),
                  type: "splitwise_expense",
                  amount: splitwiseService.toYNABAmount(expense) / 1000,
                  description: expense.description || "Unknown expense",
                  date: expense.date!.split("T")[0] || expense.date!,
                  direction: "splitwise_to_ynab",
                },
              });
            }),
          )
        : [];

    // Update sync history
    await prisma.syncHistory.update({
      where: { id: syncHistory.id },
      data: {
        status: "success",
        completedAt: new Date(),
      },
    });

    const txnCount = createdTransactionItems.length;
    const expenseCount = createdExpenseItems.length;
    console.log(`🏆 Single user sync complete for ${user.email || user.id}:`);
    console.log(`📊 YNAB transactions processed: ${txnCount}`);
    console.log(`📊 Splitwise expenses processed: ${expenseCount}`);

    return {
      success: true,
      syncHistoryId: syncHistory.id,
      syncedTransactions: createdTransactionItems,
      syncedExpenses: createdExpenseItems,
    };
  } catch (error) {
    console.error("Sync error:", error);
    Sentry.captureException(error);

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
    console.log(`📤 Processing YNAB transactions to create Splitwise expenses`);

    for (const user of group.users) {
      console.log(`\n👤 Phase 1 - Processing user: ${user.email || user.id}`);
      try {
        const result = await syncUserPhase(user.id, "ynab_to_splitwise");
        results[user.id] = result;

        const txnCount = result.syncedTransactions?.length || 0;
        console.log(
          `✅ Phase 1 complete for ${user.email || user.id}: ${txnCount} YNAB transactions processed`,
        );

        if (txnCount > 0) {
          console.log(`📝 Transactions created in Splitwise:`);
          result.syncedTransactions?.forEach((txn, idx) => {
            console.log(
              `   ${idx + 1}. ${txn.description} - $${txn.amount} (${txn.externalId})`,
            );
          });
        } else {
          console.log(
            `ℹ️ No new YNAB transactions to sync for ${user.email || user.id}`,
          );
        }
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
    console.log(`📥 Processing Splitwise expenses to create YNAB transactions`);

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

          if (expenseCount > 0) {
            console.log(`📝 Expenses created in YNAB:`);
            phase2Result.syncedExpenses?.forEach((exp, idx) => {
              console.log(
                `   ${idx + 1}. ${exp.description} - $${exp.amount} (${exp.externalId})`,
              );
            });
          } else {
            console.log(
              `ℹ️ No new Splitwise expenses to sync for ${user.email || user.id}`,
            );
          }

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
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (!user.ynabSettings || !user.splitwiseSettings) {
      throw new Error("User has not configured both YNAB and Splitwise");
    }

    if (!user.ynabSettings.splitwiseAccountId) {
      throw new Error("Splitwise account not configured in YNAB settings");
    }

    if (
      !user.splitwiseSettings.groupId ||
      !user.splitwiseSettings.currencyCode
    ) {
      throw new Error("Splitwise group or currency not configured");
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

    if (!user.splitwiseSettings.emoji) {
      throw new Error("Splitwise emoji not configured");
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

    const splitwiseService = new SplitwiseService({
      userId: user.id,
      knownEmoji: user.splitwiseSettings.emoji,
      splitwiseUserId: Number(splitwiseAccount.providerAccountId),
      groupId: user.splitwiseSettings.groupId,
      currencyCode: user.splitwiseSettings.currencyCode,
      apiKey: splitwiseAccount.access_token,
      syncState,
    });

    let syncedTransactions = [] as YNABTransaction[];
    let syncedExpenses = [] as SplitwiseExpense[];
    let createdTransactionItems: SyncedItem[] = [];
    let createdExpenseItems: SyncedItem[] = [];

    console.log(`🔍 Starting ${phase} for user ${user.email || user.id}`);
    console.log(
      `📊 Config - YNAB Budget: ${user.ynabSettings.budgetId}, Splitwise Group: ${user.splitwiseSettings.groupId}`,
    );

    if (phase === "ynab_to_splitwise") {
      console.log(`📤 Phase: YNAB → Splitwise`);
      console.log(`🔍 Checking for new YNAB transactions to sync...`);

      // Process transactions from YNAB to Splitwise
      syncedTransactions = await processLatestTransactions(
        ynabService,
        splitwiseService,
      );

      console.log(
        `📋 Found ${syncedTransactions.length} YNAB transactions to process`,
      );

      if (syncedTransactions.length > 0) {
        console.log(`💰 YNAB transactions being created in Splitwise:`);
        syncedTransactions.forEach((txn, idx) => {
          const amount = txn.amount / 1000; // Convert from milliunits
          const description =
            txn.payee_name || txn.memo || "Unknown transaction";
          console.log(
            `   ${idx + 1}. ${description} - $${amount} (ID: ${txn.id}, Date: ${txn.date})`,
          );
        });
      } else {
        console.log(`ℹ️ No new YNAB transactions found to sync`);
      }

      // Record synced transactions
      console.log(
        `💾 Recording ${syncedTransactions.length} synced transactions in database...`,
      );
      createdTransactionItems =
        syncedTransactions.length > 0
          ? await Promise.all(
              syncedTransactions.map((transaction) =>
                prisma.syncedItem.create({
                  data: {
                    syncHistoryId: syncHistory.id,
                    externalId: transaction.id,
                    type: "ynab_transaction",
                    amount: transaction.amount / 1000, // Convert from milliunits
                    description:
                      transaction.payee_name ||
                      transaction.memo ||
                      "Unknown transaction",
                    date: transaction.date!.split("T")[0] || transaction.date!,
                    direction: "ynab_to_splitwise",
                  },
                }),
              ),
            )
          : [];

      console.log(
        `✅ YNAB → Splitwise phase complete: ${createdTransactionItems.length} items recorded`,
      );
    } else {
      console.log(`📥 Phase: Splitwise → YNAB`);
      console.log(`🔍 Checking for new Splitwise expenses to sync...`);

      // Process expenses from Splitwise to YNAB
      syncedExpenses = await processLatestExpenses(
        ynabService,
        splitwiseService,
      );

      console.log(
        `📋 Found ${syncedExpenses.length} Splitwise expenses to process`,
      );

      if (syncedExpenses.length > 0) {
        console.log(`💰 Splitwise expenses being created in YNAB:`);
        syncedExpenses.forEach((exp, idx) => {
          const amount = splitwiseService.toYNABAmount(exp) / 1000;
          const description = exp.description || "Unknown expense";
          console.log(
            `   ${idx + 1}. ${description} - $${amount} (ID: ${exp.id}, Date: ${exp.date})`,
          );
        });
      } else {
        console.log(`ℹ️ No new Splitwise expenses found to sync`);
      }

      // Record synced expenses
      console.log(
        `💾 Recording ${syncedExpenses.length} synced expenses in database...`,
      );
      createdExpenseItems =
        syncedExpenses.length > 0
          ? await Promise.all(
              syncedExpenses.map((expense) => {
                return prisma.syncedItem.create({
                  data: {
                    syncHistoryId: syncHistory.id,
                    externalId: expense.id.toString(),
                    type: "splitwise_expense",
                    amount: splitwiseService.toYNABAmount(expense) / 1000,
                    description: expense.description || "Unknown expense",
                    date: expense.date!.split("T")[0] || expense.date!,
                    direction: "splitwise_to_ynab",
                  },
                });
              }),
            )
          : [];

      console.log(
        `✅ Splitwise → YNAB phase complete: ${createdExpenseItems.length} items recorded`,
      );

      // Update sync history to completed only after the final phase
      console.log(
        `🏁 Marking sync as completed for user ${user.email || user.id}`,
      );
      await prisma.syncHistory.update({
        where: { id: syncHistory.id },
        data: {
          status: "success",
          completedAt: new Date(),
        },
      });
    }

    return {
      success: true,
      syncHistoryId: syncHistory.id,
      syncedTransactions: createdTransactionItems,
      syncedExpenses: createdExpenseItems,
    };
  } catch (error) {
    console.error(`Sync error for user ${userId}, phase ${phase}:`, error);
    Sentry.captureException(error);

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
