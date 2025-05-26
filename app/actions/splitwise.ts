"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/db";
import { getSplitwiseGroups } from "@/services/splitwise-auth";
import type { SplitwiseUser } from "@/services/splitwise-types";

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

    revalidatePath("/dashboard");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error saving Splitwise user:", error);
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

    // Delete the user's settings as well
    await prisma.splitwiseSettings.deleteMany({
      where: {
        userId: session.user.id,
      },
    });

    revalidatePath("/dashboard");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error disconnecting Splitwise account:", error);
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
      conflictingUser: conflictingUser.user.name || "Another user",
      conflictingEmoji: emoji,
    };
  }

  return { hasConflict: false };
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
              currencySyncedAt: new Date(),
            },
          });
        },
      );

      await Promise.all(updatePromises);
      return {
        success: true,
        updatedPartners: partnersWithSameGroup.map(
          (p: (typeof partnersWithSameGroup)[0]) =>
            p.user.name || `User ${p.userId}`,
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
    // Get current settings to check if currency has changed
    const currentSettings = await prisma.splitwiseSettings.findUnique({
      where: { userId: session.user.id },
    });

    const isCurrencyChanged = currentSettings?.currencyCode !== currencyCode;
    const isGroupChanged = currentSettings?.groupId !== groupId;

    // Update or create the user's settings
    await prisma.splitwiseSettings.upsert({
      where: { userId: session.user.id },
      update: {
        groupId,
        groupName,
        currencyCode,
        emoji: emoji || "✅",
      },
      create: {
        userId: session.user.id,
        groupId,
        groupName,
        currencyCode,
        emoji: emoji || "✅",
      },
    });

    // If currency code changed or group changed, sync with partners
    let syncResult: {
      success: boolean;
      updatedPartners?: string[];
      error?: string;
    } = { success: true, updatedPartners: [] };
    if ((isCurrencyChanged || isGroupChanged) && currencyCode) {
      syncResult = await syncCurrencyWithPartners(
        session.user.id,
        groupId,
        currencyCode,
      );
    }

    revalidatePath("/dashboard");

    return {
      success: true,
      currencySynced: (syncResult.updatedPartners ?? []).length > 0,
      updatedPartners: syncResult.updatedPartners ?? [],
    };
  } catch (error) {
    console.error("Error saving settings:", error);
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
        partnerName: partnerSettings.user.name || "Your partner",
      };
    }

    return null;
  } catch (error) {
    console.error("Error getting partner emoji:", error);
    return null;
  }
}

// Check if currency was recently synced by partner
export async function checkCurrencySyncStatus() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  try {
    const settings = await prisma.splitwiseSettings.findUnique({
      where: { userId: session.user.id },
      select: {
        currencySyncedAt: true,
      },
    });

    if (settings?.currencySyncedAt) {
      // Check if the sync happened in the last 24 hours
      const syncTime = new Date(settings.currencySyncedAt);
      const now = new Date();
      const hoursSinceSync =
        (now.getTime() - syncTime.getTime()) / (1000 * 60 * 60);

      if (hoursSinceSync < 24) {
        return {
          recentlyUpdated: true,
          syncTime: settings.currencySyncedAt,
        };
      }
    }

    return { recentlyUpdated: false };
  } catch (error) {
    console.error("Error checking currency sync status:", error);
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
    return null;
  }
}
