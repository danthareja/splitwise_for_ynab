"use server";

import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { auth } from "@/auth";
import { prisma } from "@/db";
import {
  getSplitwiseGroups,
  validateSplitwiseApiKey,
} from "@/services/splitwise-auth";
import { sendWelcomeEmail } from "@/services/email";
import type { SplitwiseUser } from "@/types/splitwise";

export async function validateApiKey(formData: FormData) {
  const apiKey = formData.get("apiKey") as string;

  if (!apiKey || apiKey.trim() === "") {
    return {
      success: false,
      error: "API key is required",
    };
  }

  const result = await validateSplitwiseApiKey(apiKey);

  if (!result.success) {
    return {
      ...result,
      apiKey: null,
    };
  }

  return {
    success: true,
    user: result.user,
    apiKey,
  };
}

export async function saveSplitwiseUser(
  apiKey: string,
  splitwiseUser: SplitwiseUser,
) {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      error: "You must be logged in to save your Splitwise information",
    };
  }

  try {
    // Check if the user already has a Splitwise account
    const existingAccount = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: "splitwise",
      },
    });

    // Delete any existing settings when updating the API key
    // This ensures users reconfigure their settings with the new API key
    await prisma.splitwiseSettings.deleteMany({
      where: {
        userId: session.user.id,
      },
    });

    if (existingAccount) {
      // Update existing account
      await prisma.account.update({
        where: { id: existingAccount.id },
        data: {
          access_token: apiKey,
          providerAccountId: splitwiseUser.id.toString(),
        },
      });
    } else {
      // Create new account
      await prisma.account.create({
        data: {
          userId: session.user.id,
          type: "oauth",
          provider: "splitwise",
          providerAccountId: splitwiseUser.id.toString(),
          access_token: apiKey,
        },
      });
    }

    // Update user information with Splitwise data
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: `${splitwiseUser.first_name} ${splitwiseUser.last_name}`,
        email: splitwiseUser.email,
        image: splitwiseUser.picture.medium,
      },
    });

    // Send welcome email only for new Splitwise connections
    if (!existingAccount && splitwiseUser.email) {
      try {
        await sendWelcomeEmail({
          to: splitwiseUser.email,
          userName: splitwiseUser.first_name,
        });
      } catch (emailError) {
        // Log the error but don't fail the whole operation
        console.error("Failed to send welcome email:", emailError);
        Sentry.captureException(emailError);
      }
    }

    revalidatePath("/dashboard");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error saving Splitwise user:", error);
    Sentry.captureException(error);
    return {
      success: false,
      error: "Failed to save your Splitwise information",
    };
  }
}

export async function disconnectSplitwiseAccount() {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      error: "You must be logged in to disconnect your Splitwise account",
    };
  }

  try {
    // Delete the Splitwise account
    await prisma.account.deleteMany({
      where: {
        userId: session.user.id,
        provider: "splitwise",
      },
    });

    // Only clear group-specific settings, keep user preferences
    await prisma.splitwiseSettings.updateMany({
      where: {
        userId: session.user.id,
      },
      data: {
        groupId: null,
        groupName: null,
        currencyCode: null,
        defaultSplitRatio: null,
        lastPartnerSyncAt: null,
        // Keep user preferences: emoji, useDescriptionAsPayee, customPayeeName
      },
    });

    revalidatePath("/dashboard");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error disconnecting Splitwise account:", error);
    Sentry.captureException(error);
    return {
      success: false,
      error: "Failed to disconnect your Splitwise account",
    };
  }
}

export async function getSplitwiseApiKey() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  try {
    const account = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: "splitwise",
      },
    });

    return account?.access_token || null;
  } catch (error) {
    console.error("Error getting Splitwise API key:", error);
    Sentry.captureException(error);
    return null;
  }
}

export async function getSplitwiseGroupsForUser() {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      error: "You must be logged in to fetch groups",
    };
  }

  const apiKey = await getSplitwiseApiKey();

  if (!apiKey) {
    return {
      success: false,
      error:
        "No Splitwise API key found. Please connect your Splitwise account first.",
    };
  }

  const result = await getSplitwiseGroups(apiKey);

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    };
  }

  // Filter groups by updated_at within last year and sort by descending updated_at
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const filteredGroups =
    result.groups
      ?.filter((group) => {
        if (group.id == 0) {
          return false; // default non-group-expenses
        }

        const updatedAt = new Date(group.updated_at);
        return updatedAt >= oneYearAgo;
      })
      .sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      ) ?? [];

  // Filter groups to only include those with exactly 2 members
  const validGroups = filteredGroups.filter(
    (group) => group.members.length === 2,
  );
  const invalidGroups = filteredGroups.filter(
    (group) => group.members.length !== 2,
  );

  return {
    success: true,
    validGroups,
    invalidGroups,
  };
}

// Check for emoji conflicts
async function checkEmojiConflict(
  userId: string,
  groupId: string,
  emoji: string,
) {
  // Get all users who have this group configured
  const usersWithSameGroup = await prisma.splitwiseSettings.findMany({
    where: {
      groupId: groupId,
      userId: {
        not: userId, // Exclude the current user
      },
    },
    include: {
      user: true,
    },
  });

  // Check if any other user in this group is using the same emoji
  const conflictingUser = usersWithSameGroup.find(
    (settings: (typeof usersWithSameGroup)[0]) => settings.emoji === emoji,
  );

  if (conflictingUser) {
    return {
      hasConflict: true,
      conflictingUser:
        conflictingUser.user.name?.split(" ")[0] || "Your partner",
      conflictingEmoji: emoji,
    };
  }

  return { hasConflict: false };
}

// Synchronize split ratio with all partners in the same group
async function syncSplitRatioWithPartners(
  userId: string,
  groupId: string,
  splitRatio: string,
) {
  try {
    // Find all other users with the same group
    const partnersWithSameGroup = await prisma.splitwiseSettings.findMany({
      where: {
        groupId: groupId,
        userId: {
          not: userId, // Exclude the current user
        },
      },
      include: {
        user: true,
      },
    });

    // Update split ratio for all partners
    if (partnersWithSameGroup.length > 0) {
      const updatePromises = partnersWithSameGroup.map(
        (partnerSettings: (typeof partnersWithSameGroup)[0]) => {
          // Reverse the split ratio for partners (if user has 2:1, partner gets 1:2)
          const [userShares, partnerShares] = splitRatio.split(":");
          const partnerSplitRatio = `${partnerShares}:${userShares}`;

          return prisma.splitwiseSettings.update({
            where: { userId: partnerSettings.userId },
            data: {
              defaultSplitRatio: partnerSplitRatio,
              // Add a flag to indicate the split ratio was synchronized
              lastPartnerSyncAt: new Date(),
            },
          });
        },
      );

      await Promise.all(updatePromises);
      return {
        success: true,
        updatedPartners: partnersWithSameGroup.map(
          (p: (typeof partnersWithSameGroup)[0]) =>
            p.user.name?.split(" ")[0] || `Your partner`,
        ),
      };
    }

    return { success: true, updatedPartners: [] };
  } catch (error) {
    console.error("Error syncing split ratio with partners:", error);
    return {
      success: false,
      error: "Failed to sync split ratio with partners",
    };
  }
}

// Synchronize currency code with all partners in the same group
async function syncCurrencyWithPartners(
  userId: string,
  groupId: string,
  currencyCode: string,
) {
  try {
    // Find all other users with the same group
    const partnersWithSameGroup = await prisma.splitwiseSettings.findMany({
      where: {
        groupId: groupId,
        userId: {
          not: userId, // Exclude the current user
        },
      },
      include: {
        user: true,
      },
    });

    // Update currency code for all partners
    if (partnersWithSameGroup.length > 0) {
      const updatePromises = partnersWithSameGroup.map(
        (partnerSettings: (typeof partnersWithSameGroup)[0]) => {
          return prisma.splitwiseSettings.update({
            where: { userId: partnerSettings.userId },
            data: {
              currencyCode: currencyCode,
              // Add a flag to indicate the currency was synchronized
              lastPartnerSyncAt: new Date(),
            },
          });
        },
      );

      await Promise.all(updatePromises);
      return {
        success: true,
        updatedPartners: partnersWithSameGroup.map(
          (p: (typeof partnersWithSameGroup)[0]) =>
            p.user.name?.split(" ")[0] || `Your partner`,
        ),
      };
    }

    return { success: true, updatedPartners: [] };
  } catch (error) {
    console.error("Error syncing currency with partners:", error);
    return { success: false, error: "Failed to sync currency with partners" };
  }
}

export async function saveSplitwiseSettings(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      error: "You must be logged in to save settings",
    };
  }

  const groupId = formData.get("groupId") as string;
  const groupName = formData.get("groupName") as string;
  const currencyCode = formData.get("currencyCode") as string;
  const emoji = formData.get("emoji") as string;
  const splitRatio = formData.get("splitRatio") as string;
  const useDescriptionAsPayee =
    formData.get("useDescriptionAsPayee") === "true";
  const customPayeeName = formData.get("customPayeeName") as string;

  if (!groupId || !currencyCode) {
    return {
      success: false,
      error: "Group and currency code are required",
    };
  }

  // Check for emoji conflicts
  const emojiConflict = await checkEmojiConflict(
    session.user.id,
    groupId,
    emoji || "✅",
  );

  if (emojiConflict.hasConflict) {
    return {
      success: false,
      error: `Emoji conflict: ${emojiConflict.conflictingUser} is already using the emoji "${emojiConflict.conflictingEmoji}". Please choose a different emoji.`,
      isEmojiConflict: true,
    };
  }

  try {
    // Get current settings to check if currency or split ratio has changed
    const currentSettings = await prisma.splitwiseSettings.findUnique({
      where: { userId: session.user.id },
    });

    // If this is a new group connection and user hasn't provided currency/split ratio,
    // try to sync from partner's existing settings
    let finalCurrencyCode = currencyCode;
    let finalSplitRatio = splitRatio || "1:1";
    let partnerSyncMessage = "";

    const isNewGroupConnection = currentSettings?.groupId !== groupId;
    if (isNewGroupConnection && (!currencyCode || !splitRatio)) {
      const partnerSettings = await syncFromPartnerIfAvailable(
        session.user.id,
        groupId,
      );
      if (partnerSettings) {
        if (!currencyCode && partnerSettings.currencyCode) {
          finalCurrencyCode = partnerSettings.currencyCode;
          partnerSyncMessage += `Currency (${partnerSettings.currencyCode}) `;
        }
        if (!splitRatio && partnerSettings.defaultSplitRatio) {
          finalSplitRatio = partnerSettings.defaultSplitRatio;
          partnerSyncMessage += `Split ratio (${partnerSettings.defaultSplitRatio}) `;
        }
        if (partnerSyncMessage) {
          partnerSyncMessage = `${partnerSyncMessage.trim()} synced from ${partnerSettings.partnerName}`;
        }
      }
    }

    const isCurrencyChanged =
      currentSettings?.currencyCode !== finalCurrencyCode;
    const isGroupChanged = currentSettings?.groupId !== groupId;
    const isSplitRatioChanged =
      currentSettings?.defaultSplitRatio !== finalSplitRatio;

    // Update or create the user's settings
    await prisma.splitwiseSettings.upsert({
      where: { userId: session.user.id },
      update: {
        groupId,
        groupName,
        currencyCode: finalCurrencyCode,
        emoji: emoji || "✅",
        defaultSplitRatio: finalSplitRatio,
        useDescriptionAsPayee,
        customPayeeName,
      },
      create: {
        userId: session.user.id,
        groupId,
        groupName,
        currencyCode: finalCurrencyCode,
        emoji: emoji || "✅",
        defaultSplitRatio: finalSplitRatio,
        useDescriptionAsPayee,
        customPayeeName,
      },
    });

    // If currency code changed or group changed, sync with partners
    let currencySyncResult: {
      success: boolean;
      updatedPartners?: string[];
      error?: string;
    } = { success: true, updatedPartners: [] };
    if ((isCurrencyChanged || isGroupChanged) && finalCurrencyCode) {
      currencySyncResult = await syncCurrencyWithPartners(
        session.user.id,
        groupId,
        finalCurrencyCode,
      );
    }

    // If split ratio changed or group changed, sync with partners
    let splitRatioSyncResult: {
      success: boolean;
      updatedPartners?: string[];
      error?: string;
    } = { success: true, updatedPartners: [] };
    if ((isSplitRatioChanged || isGroupChanged) && finalSplitRatio) {
      splitRatioSyncResult = await syncSplitRatioWithPartners(
        session.user.id,
        groupId,
        finalSplitRatio,
      );
    }

    revalidatePath("/dashboard");

    return {
      success: true,
      currencySynced: (currencySyncResult.updatedPartners ?? []).length > 0,
      splitRatioSynced: (splitRatioSyncResult.updatedPartners ?? []).length > 0,
      partnerSyncMessage: partnerSyncMessage || undefined,
      updatedPartners: [
        ...(currencySyncResult.updatedPartners ?? []),
        ...(splitRatioSyncResult.updatedPartners ?? []),
      ],
    };
  } catch (error) {
    console.error("Error saving settings:", error);
    Sentry.captureException(error);
    return {
      success: false,
      error: "Failed to save settings",
    };
  }
}

// Get partner's emoji and currency
export async function getPartnerEmoji(groupId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  try {
    // Find settings for other users with the same group
    const partnerSettings = await prisma.splitwiseSettings.findFirst({
      where: {
        groupId: groupId,
        userId: {
          not: session.user.id,
        },
      },
      select: {
        emoji: true,
        currencyCode: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    if (partnerSettings) {
      return {
        emoji: partnerSettings.emoji,
        currencyCode: partnerSettings.currencyCode,
        partnerName: partnerSettings.user.name?.split(" ")[0] || "Your partner",
      };
    }

    return null;
  } catch (error) {
    console.error("Error getting partner emoji:", error);
    Sentry.captureException(error);
    return null;
  }
}

// Check if settings were recently synced by partner
export async function checkPartnerSyncStatus() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  try {
    const settings = await prisma.splitwiseSettings.findUnique({
      where: { userId: session.user.id },
      select: {
        lastPartnerSyncAt: true,
      },
    });

    if (settings?.lastPartnerSyncAt) {
      // Check if the sync happened in the last 24 hours
      const syncTime = new Date(settings.lastPartnerSyncAt);
      const now = new Date();
      const hoursSinceSync =
        (now.getTime() - syncTime.getTime()) / (1000 * 60 * 60);

      if (hoursSinceSync < 24) {
        return {
          recentlyUpdated: true,
          syncTime: settings.lastPartnerSyncAt,
        };
      }
    }

    return { recentlyUpdated: false };
  } catch (error) {
    console.error("Error checking currency sync status:", error);
    Sentry.captureException(error);
    return null;
  }
}

export async function getSplitwiseSettings() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  try {
    const settings = await prisma.splitwiseSettings.findUnique({
      where: { userId: session.user.id },
    });

    return settings;
  } catch (error) {
    console.error("Error getting user settings:", error);
    Sentry.captureException(error);
    return null;
  }
}

export async function testSplitwiseConnection() {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      error: "You must be logged in to test the connection",
    };
  }

  try {
    const apiKey = await getSplitwiseApiKey();

    if (!apiKey) {
      return {
        success: false,
        error: "No Splitwise API key found",
        isConnectionError: true,
      };
    }

    const result = await validateSplitwiseApiKey(apiKey);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        isConnectionError: true,
      };
    }

    return {
      success: true,
      user: result.user,
    };
  } catch (error) {
    console.error("Error testing Splitwise connection:", error);
    Sentry.captureException(error);
    return {
      success: false,
      error: "Failed to test connection",
      isConnectionError: true,
    };
  }
}

// New function to sync settings from partner when connecting to existing group
async function syncFromPartnerIfAvailable(userId: string, groupId: string) {
  try {
    // Check if there's already a partner with this group configured
    const partnerSettings = await prisma.splitwiseSettings.findFirst({
      where: {
        groupId: groupId,
        userId: {
          not: userId,
        },
        // Only sync from partners who have complete settings
        currencyCode: {
          not: null,
        },
      },
      select: {
        currencyCode: true,
        defaultSplitRatio: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    if (partnerSettings) {
      // Reverse the split ratio for the new partner
      let newPartnerSplitRatio = "1:1";
      if (partnerSettings.defaultSplitRatio) {
        const [partnerShares, userShares] =
          partnerSettings.defaultSplitRatio.split(":");
        newPartnerSplitRatio = `${userShares}:${partnerShares}`;
      }

      return {
        currencyCode: partnerSettings.currencyCode,
        defaultSplitRatio: newPartnerSplitRatio,
        partnerName: partnerSettings.user.name?.split(" ")[0] || "Your partner",
      };
    }

    return null;
  } catch (error) {
    console.error("Error syncing from partner:", error);
    return null;
  }
}
