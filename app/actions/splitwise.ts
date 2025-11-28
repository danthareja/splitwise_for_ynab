"use server";

import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { auth } from "@/auth";
import { prisma } from "@/db";
import {
  getSplitwiseGroups,
  validateSplitwiseApiKey,
} from "@/services/splitwise-auth";
import { getUserFirstName } from "@/lib/utils";
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
        firstName: splitwiseUser.first_name,
        lastName: splitwiseUser.last_name,
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
      conflictingUser: getUserFirstName(conflictingUser.user) || "Your partner",
      conflictingEmoji: emoji,
    };
  }

  return { hasConflict: false };
}

// Synchronize split ratio with household partner (only primary ↔ secondary)
async function syncSplitRatioWithPartner(
  userId: string,
  groupId: string,
  splitRatio: string,
) {
  try {
    // Get the current user to check their partnership status
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        primaryUserId: true,
        secondaryUser: {
          select: { id: true },
        },
      },
    });

    if (!currentUser) {
      return { success: true, updatedPartners: [] };
    }

    // Find the partner - either current user's primary or secondary
    const partnerId =
      currentUser.primaryUserId || currentUser.secondaryUser?.id;
    if (!partnerId) {
      // No explicit partnership, no sync needed
      return { success: true, updatedPartners: [] };
    }

    // Verify partner has the same group
    const partnerSettings = await prisma.splitwiseSettings.findFirst({
      where: {
        userId: partnerId,
        groupId: groupId,
      },
      include: {
        user: true,
      },
    });

    if (!partnerSettings) {
      return { success: true, updatedPartners: [] };
    }

    // Reverse the split ratio for partner (if user has 2:1, partner gets 1:2)
    const [userShares, partnerShares] = splitRatio.split(":");
    const partnerSplitRatio = `${partnerShares}:${userShares}`;

    await prisma.splitwiseSettings.update({
      where: { userId: partnerId },
      data: {
        defaultSplitRatio: partnerSplitRatio,
        lastPartnerSyncAt: new Date(),
      },
    });

    return {
      success: true,
      updatedPartners: [
        getUserFirstName(partnerSettings.user) || "Your partner",
      ],
    };
  } catch (error) {
    console.error("Error syncing split ratio with partner:", error);
    return {
      success: false,
      error: "Failed to sync split ratio with partner",
    };
  }
}

// Synchronize currency code with household partner (only primary ↔ secondary)
async function syncCurrencyWithPartner(
  userId: string,
  groupId: string,
  currencyCode: string,
) {
  try {
    // Get the current user to check their partnership status
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        primaryUserId: true,
        secondaryUser: {
          select: { id: true },
        },
      },
    });

    if (!currentUser) {
      return { success: true, updatedPartners: [] };
    }

    // Find the partner - either current user's primary or secondary
    const partnerId =
      currentUser.primaryUserId || currentUser.secondaryUser?.id;
    if (!partnerId) {
      // No explicit partnership, no sync needed
      return { success: true, updatedPartners: [] };
    }

    // Verify partner has the same group
    const partnerSettings = await prisma.splitwiseSettings.findFirst({
      where: {
        userId: partnerId,
        groupId: groupId,
      },
      include: {
        user: true,
      },
    });

    if (!partnerSettings) {
      return { success: true, updatedPartners: [] };
    }

    await prisma.splitwiseSettings.update({
      where: { userId: partnerId },
      data: {
        currencyCode: currencyCode,
        lastPartnerSyncAt: new Date(),
      },
    });

    return {
      success: true,
      updatedPartners: [
        getUserFirstName(partnerSettings.user) || "Your partner",
      ],
    };
  } catch (error) {
    console.error("Error syncing currency with partner:", error);
    return { success: false, error: "Failed to sync currency with partner" };
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

  // Check if this group is already in use by another user without explicit partnership
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      persona: true,
      primaryUserId: true,
      secondaryUser: { select: { id: true } },
    },
  });

  if (currentUser) {
    // Find any other user using this group
    const existingGroupUser = await prisma.splitwiseSettings.findFirst({
      where: {
        groupId: groupId,
        userId: { not: session.user.id },
      },
      select: {
        userId: true,
        user: {
          select: {
            id: true,
            firstName: true,
            name: true,
            persona: true,
          },
        },
      },
    });

    if (existingGroupUser) {
      // Check if we have an explicit partnership with this user
      const isPartner =
        currentUser.primaryUserId === existingGroupUser.userId ||
        currentUser.secondaryUser?.id === existingGroupUser.userId;

      if (!isPartner) {
        // Block: group is in use by someone we're not partnered with
        const existingUserName =
          getUserFirstName(existingGroupUser.user) || "Another user";
        const existingUserPersona = existingGroupUser.user.persona;

        if (existingUserPersona === "dual") {
          return {
            success: false,
            error: `This group is already used by ${existingUserName}. To share this group, ask them to invite you to their duo account.`,
            isGroupConflict: true,
          };
        } else {
          return {
            success: false,
            error: `This group is already used by ${existingUserName} (Solo mode). To share this group, ask them to switch to Duo mode and invite you.`,
            isGroupConflict: true,
          };
        }
      }
    }
  }

  try {
    // Get current settings to check if currency or split ratio has changed
    const currentSettings = await prisma.splitwiseSettings.findUnique({
      where: { userId: session.user.id },
    });

    // If this is a new group connection and user hasn't provided currency/split ratio,
    // try to sync from primary's existing settings (only for secondary users)
    let finalCurrencyCode = currencyCode;
    let finalSplitRatio = splitRatio || "1:1";
    let partnerSyncMessage = "";

    const isNewGroupConnection = currentSettings?.groupId !== groupId;
    if (isNewGroupConnection && (!currencyCode || !splitRatio)) {
      const primarySettings = await syncFromPrimaryIfSecondary(
        session.user.id,
        groupId,
      );
      if (primarySettings) {
        if (!currencyCode && primarySettings.currencyCode) {
          finalCurrencyCode = primarySettings.currencyCode;
          partnerSyncMessage += `Currency (${primarySettings.currencyCode}) `;
        }
        if (!splitRatio && primarySettings.defaultSplitRatio) {
          finalSplitRatio = primarySettings.defaultSplitRatio;
          partnerSyncMessage += `Split ratio (${primarySettings.defaultSplitRatio}) `;
        }
        if (partnerSyncMessage) {
          partnerSyncMessage = `${partnerSyncMessage.trim()} synced from ${primarySettings.partnerName}`;
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

    // If currency code changed or group changed, sync with household partner
    let currencySyncResult: {
      success: boolean;
      updatedPartners?: string[];
      error?: string;
    } = { success: true, updatedPartners: [] };
    if ((isCurrencyChanged || isGroupChanged) && finalCurrencyCode) {
      currencySyncResult = await syncCurrencyWithPartner(
        session.user.id,
        groupId,
        finalCurrencyCode,
      );
    }

    // If split ratio changed or group changed, sync with household partner
    let splitRatioSyncResult: {
      success: boolean;
      updatedPartners?: string[];
      error?: string;
    } = { success: true, updatedPartners: [] };
    if ((isSplitRatioChanged || isGroupChanged) && finalSplitRatio) {
      splitRatioSyncResult = await syncSplitRatioWithPartner(
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

// Get household partner's emoji and currency (only for explicit primary/secondary relationship)
export async function getPartnerEmoji(groupId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  try {
    // First, check if user has an explicit partnership
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        primaryUserId: true,
        secondaryUser: { select: { id: true } },
      },
    });

    if (!currentUser) {
      return null;
    }

    // Find the partner ID - either current user's primary or secondary
    const partnerId =
      currentUser.primaryUserId || currentUser.secondaryUser?.id;

    if (!partnerId) {
      // No explicit partnership, no partner info to return
      return null;
    }

    // Get the partner's settings
    const partnerSettings = await prisma.splitwiseSettings.findFirst({
      where: {
        userId: partnerId,
        groupId: groupId,
      },
      select: {
        emoji: true,
        currencyCode: true,
        user: {
          select: {
            firstName: true,
            name: true,
          },
        },
      },
    });

    if (partnerSettings) {
      return {
        emoji: partnerSettings.emoji,
        currencyCode: partnerSettings.currencyCode,
        partnerName: getUserFirstName(partnerSettings.user) || "Your partner",
      };
    }

    return null;
  } catch (error) {
    console.error("Error getting partner emoji:", error);
    Sentry.captureException(error);
    return null;
  }
}

// Detect if there's an existing user for a given Splitwise group
// Returns user info and their persona so UI can show appropriate prompts:
// - If existing user is dual primary: "Join [name]'s household?"
// - If existing user is solo: "This group is used by [name]. Ask them to switch to Duo mode."
export async function detectExistingGroupUser(groupId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  try {
    // Find another user with the same group who is not a secondary
    // (either solo or dual primary)
    const existingUser = await prisma.user.findFirst({
      where: {
        id: {
          not: session.user.id,
        },
        // Must have SplitwiseSettings with this group
        splitwiseSettings: {
          groupId: groupId,
        },
        // Must be a primary (no primaryUserId set) - not a secondary
        primaryUserId: null,
        // Must have completed onboarding
        onboardingComplete: true,
      },
      select: {
        id: true,
        firstName: true,
        name: true,
        email: true,
        image: true,
        persona: true,
        // Check if they already have a secondary (household is full)
        secondaryUser: {
          select: { id: true },
        },
        splitwiseSettings: {
          select: {
            currencyCode: true,
            emoji: true,
            defaultSplitRatio: true,
            useDescriptionAsPayee: true,
            customPayeeName: true,
          },
        },
      },
    });

    if (existingUser) {
      return {
        id: existingUser.id,
        name: getUserFirstName(existingUser) || "Another user",
        email: existingUser.email,
        image: existingUser.image,
        persona: existingUser.persona as "solo" | "dual" | null,
        hasPartner: !!existingUser.secondaryUser,
        settings: existingUser.splitwiseSettings,
      };
    }

    return null;
  } catch (error) {
    console.error("Error detecting existing group user:", error);
    Sentry.captureException(error);
    return null;
  }
}

// Join an existing household as a secondary user
export async function joinHousehold(primaryUserId: string, emoji: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "You must be logged in" };
  }

  if (!emoji) {
    return { success: false, error: "Emoji is required" };
  }

  try {
    // Verify the primary user exists and is valid
    const primaryUser = await prisma.user.findUnique({
      where: { id: primaryUserId },
      select: {
        id: true,
        primaryUserId: true,
        persona: true,
        onboardingComplete: true,
        splitwiseSettings: true,
        secondaryUser: true,
      },
    });

    if (!primaryUser) {
      return { success: false, error: "Primary user not found" };
    }

    if (primaryUser.primaryUserId) {
      return { success: false, error: "This user is already a secondary" };
    }

    if (primaryUser.secondaryUser) {
      return {
        success: false,
        error: "This duo account already has a partner",
      };
    }

    if (!primaryUser.splitwiseSettings) {
      return {
        success: false,
        error: "Primary user has not configured Splitwise",
      };
    }

    const primarySettings = primaryUser.splitwiseSettings;

    // Check emoji conflict with primary
    if (emoji === primarySettings.emoji) {
      return {
        success: false,
        error: `Choose a different emoji—your partner is using "${primarySettings.emoji}"`,
        isEmojiConflict: true,
      };
    }

    // Link current user as secondary AND create their SplitwiseSettings
    await prisma.$transaction([
      prisma.user.update({
        where: { id: session.user.id },
        data: {
          primaryUserId: primaryUserId,
          persona: "dual",
        },
      }),
      // Create SplitwiseSettings for secondary with shared settings + their own emoji
      prisma.splitwiseSettings.upsert({
        where: { userId: session.user.id },
        create: {
          userId: session.user.id,
          groupId: primarySettings.groupId,
          groupName: primarySettings.groupName,
          currencyCode: primarySettings.currencyCode,
          defaultSplitRatio: primarySettings.defaultSplitRatio || "1:1",
          emoji: emoji,
          // useDescriptionAsPayee defaults to true
          // customPayeeName stays null - user can configure their own
        },
        update: {
          groupId: primarySettings.groupId,
          groupName: primarySettings.groupName,
          currencyCode: primarySettings.currencyCode,
          defaultSplitRatio: primarySettings.defaultSplitRatio || "1:1",
          emoji: emoji,
        },
      }),
    ]);

    return { success: true };
  } catch (error) {
    console.error("Error joining household:", error);
    Sentry.captureException(error);
    return { success: false, error: "Failed to join duo account" };
  }
}

// Generate a partner invite token for streamlined secondary setup
// Can accept settings directly (for onboarding when not yet saved) or read from DB
export async function createPartnerInvite(settings?: {
  groupId: string;
  groupName?: string | null;
  currencyCode: string;
  emoji: string;
  defaultSplitRatio?: string;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        splitwiseSettings: true,
        secondaryUser: true,
      },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Must be a dual user who is primary (no primaryUserId)
    // Skip this check if settings are provided directly (during onboarding)
    if (!settings && user.persona !== "dual") {
      return {
        success: false,
        error: `Only dual users can create partner invites (current: ${user.persona || "none"})`,
      };
    }

    if (user.secondaryUser) {
      return { success: false, error: "You already have a partner connected" };
    }

    // Use provided settings or fall back to database
    const effectiveSettings = settings || user.splitwiseSettings;

    if (
      !effectiveSettings?.groupId ||
      !effectiveSettings?.currencyCode ||
      !effectiveSettings?.emoji
    ) {
      const missing = [];
      if (!effectiveSettings?.groupId) missing.push("groupId");
      if (!effectiveSettings?.currencyCode) missing.push("currency");
      if (!effectiveSettings?.emoji) missing.push("emoji");
      return {
        success: false,
        error: `Missing settings: ${missing.join(", ")}`,
      };
    }

    // Generate a short URL-friendly token
    const { nanoid } = await import("nanoid");
    const token = nanoid(12); // 12 character alphanumeric token

    // Check for existing pending invites and expire them
    await prisma.partnerInvite.updateMany({
      where: {
        primaryUserId: session.user.id,
        status: "pending",
      },
      data: {
        status: "expired",
      },
    });

    // Get split ratio from settings or database
    const splitRatio =
      settings?.defaultSplitRatio ||
      user.splitwiseSettings?.defaultSplitRatio ||
      "1:1";

    // Create new invite (expires in 7 days)
    const invite = await prisma.partnerInvite.create({
      data: {
        token,
        primaryUserId: session.user.id,
        groupId: effectiveSettings.groupId,
        groupName: effectiveSettings.groupName || null,
        currencyCode: effectiveSettings.currencyCode,
        defaultSplitRatio: splitRatio,
        primaryEmoji: effectiveSettings.emoji,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return {
      success: true,
      token: invite.token,
      expiresAt: invite.expiresAt,
    };
  } catch (error) {
    console.error("Error creating partner invite:", error);
    Sentry.captureException(error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: `Failed to create invite: ${errorMessage}`,
    };
  }
}

// Get an existing pending invite for the current user
export async function getExistingInvite() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  try {
    const invite = await prisma.partnerInvite.findFirst({
      where: {
        primaryUserId: session.user.id,
        status: "pending",
        expiresAt: { gt: new Date() },
      },
      select: {
        token: true,
        expiresAt: true,
      },
    });

    return invite;
  } catch (error) {
    console.error("Error getting existing invite:", error);
    return null;
  }
}

// Validate and get invite details by token
export async function getInviteByToken(token: string) {
  try {
    const invite = await prisma.partnerInvite.findUnique({
      where: { token },
    });

    if (!invite) {
      return { success: false, error: "Invite not found" };
    }

    if (invite.status !== "pending") {
      return { success: false, error: "This invite has already been used" };
    }

    if (invite.expiresAt < new Date()) {
      return { success: false, error: "This invite has expired" };
    }

    // Get primary user's CURRENT info and settings (not just cached invite values)
    const primaryUser = await prisma.user.findUnique({
      where: { id: invite.primaryUserId },
      select: {
        firstName: true,
        name: true,
        email: true,
        splitwiseSettings: {
          select: {
            groupId: true,
            groupName: true,
            currencyCode: true,
            defaultSplitRatio: true,
            emoji: true,
          },
        },
      },
    });

    // Use primary's current settings, fall back to cached invite values
    const currentSettings = primaryUser?.splitwiseSettings;

    return {
      success: true,
      invite: {
        primaryUserId: invite.primaryUserId,
        primaryName: getUserFirstName(primaryUser) || "Your partner",
        primaryEmail: primaryUser?.email,
        // Prefer current settings over cached invite values
        groupId: currentSettings?.groupId || invite.groupId,
        groupName: currentSettings?.groupName || invite.groupName,
        currencyCode: currentSettings?.currencyCode || invite.currencyCode,
        defaultSplitRatio:
          currentSettings?.defaultSplitRatio || invite.defaultSplitRatio,
        primaryEmoji: currentSettings?.emoji || invite.primaryEmoji,
      },
    };
  } catch (error) {
    console.error("Error getting invite:", error);
    Sentry.captureException(error);
    return { success: false, error: "Failed to validate invite" };
  }
}

// Accept an invite and become secondary
export async function acceptInvite(token: string, emoji: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const invite = await prisma.partnerInvite.findUnique({
      where: { token },
    });

    if (!invite) {
      return { success: false, error: "Invite not found" };
    }

    if (invite.status !== "pending") {
      return { success: false, error: "This invite has already been used" };
    }

    if (invite.expiresAt < new Date()) {
      return { success: false, error: "This invite has expired" };
    }

    // Verify primary still exists, doesn't have a secondary, and has settings
    const primaryUser = await prisma.user.findUnique({
      where: { id: invite.primaryUserId },
      include: {
        secondaryUser: true,
        splitwiseSettings: true,
      },
    });

    if (!primaryUser) {
      return { success: false, error: "Primary user no longer exists" };
    }

    if (primaryUser.secondaryUser) {
      return {
        success: false,
        error: "This duo account already has a partner",
      };
    }

    // Get primary's CURRENT settings (not cached invite values)
    const primarySettings = primaryUser.splitwiseSettings;
    if (!primarySettings?.groupId || !primarySettings?.currencyCode) {
      return {
        success: false,
        error: "Primary user's settings are incomplete",
      };
    }

    // Check emoji conflict against primary's CURRENT emoji
    const primaryEmoji = primarySettings.emoji || invite.primaryEmoji;
    if (emoji === primaryEmoji) {
      return {
        success: false,
        error: `Please choose a different emoji - your partner is using ${primaryEmoji}`,
      };
    }

    // Link current user as secondary and mark invite as accepted
    // Use primary's CURRENT settings, not cached invite values
    // Don't mark onboarding complete - they still need to configure YNAB (step 2)
    await prisma.$transaction([
      prisma.user.update({
        where: { id: session.user.id },
        data: {
          primaryUserId: invite.primaryUserId,
          persona: "dual",
          onboardingComplete: false, // Still need YNAB config
          onboardingStep: 2, // Step 2 = Configure YNAB
        },
      }),
      // Create SplitwiseSettings for secondary with shared settings + their own emoji
      // Note: customPayeeName and useDescriptionAsPayee are NOT copied - each user manages their own
      prisma.splitwiseSettings.upsert({
        where: { userId: session.user.id },
        create: {
          userId: session.user.id,
          groupId: primarySettings.groupId,
          groupName: primarySettings.groupName,
          currencyCode: primarySettings.currencyCode,
          defaultSplitRatio: primarySettings.defaultSplitRatio || "1:1",
          emoji: emoji,
          // useDescriptionAsPayee defaults to true
          // customPayeeName stays null - user can configure their own
        },
        update: {
          groupId: primarySettings.groupId,
          groupName: primarySettings.groupName,
          currencyCode: primarySettings.currencyCode,
          defaultSplitRatio: primarySettings.defaultSplitRatio || "1:1",
          emoji: emoji,
        },
      }),
      prisma.partnerInvite.update({
        where: { token },
        data: {
          status: "accepted",
          acceptedByUserId: session.user.id,
          acceptedAt: new Date(),
        },
      }),
    ]);

    return { success: true };
  } catch (error) {
    console.error("Error accepting invite:", error);
    Sentry.captureException(error);
    return { success: false, error: "Failed to accept invite" };
  }
}

// Link user as secondary via invite - they'll go through normal onboarding
// SplitwiseSettings are NOT created here - they're created in step 3 after verifying group access
export async function linkAsSecondary(token: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const invite = await prisma.partnerInvite.findUnique({
      where: { token },
    });

    if (!invite) {
      return { success: false, error: "Invite not found" };
    }

    if (invite.status !== "pending") {
      return { success: false, error: "This invite has already been used" };
    }

    if (invite.expiresAt < new Date()) {
      return { success: false, error: "This invite has expired" };
    }

    // Verify primary still exists and doesn't have a secondary
    const primaryUser = await prisma.user.findUnique({
      where: { id: invite.primaryUserId },
      include: {
        secondaryUser: true,
        splitwiseSettings: true,
      },
    });

    if (!primaryUser) {
      return { success: false, error: "Primary user no longer exists" };
    }

    if (primaryUser.secondaryUser) {
      return {
        success: false,
        error: "This duo account already has a partner",
      };
    }

    // Verify primary has settings configured
    const primarySettings = primaryUser.splitwiseSettings;
    if (!primarySettings?.groupId || !primarySettings?.currencyCode) {
      return {
        success: false,
        error: "Primary user's settings are incomplete",
      };
    }

    // Link current user as secondary and mark invite as accepted
    // They start at step 0 (Connect Splitwise) and go through normal onboarding
    // SplitwiseSettings will be created in step 3 after we verify they have group access
    await prisma.$transaction([
      prisma.user.update({
        where: { id: session.user.id },
        data: {
          primaryUserId: invite.primaryUserId,
          persona: "dual",
          onboardingComplete: false,
          onboardingStep: 0, // Start at step 0 (Connect Splitwise)
        },
      }),
      // Don't create SplitwiseSettings yet - created in step 3 after group access verification
      prisma.partnerInvite.update({
        where: { token },
        data: {
          status: "accepted",
          acceptedByUserId: session.user.id,
          acceptedAt: new Date(),
        },
      }),
    ]);

    return { success: true };
  } catch (error) {
    console.error("Error linking as secondary:", error);
    Sentry.captureException(error);
    return { success: false, error: "Failed to join duo account" };
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

// Sync settings from primary when secondary joins a group
// Only works for users with explicit primary/secondary relationship
async function syncFromPrimaryIfSecondary(userId: string, groupId: string) {
  try {
    // Get the current user to check if they're a secondary
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { primaryUserId: true },
    });

    if (!currentUser?.primaryUserId) {
      // Not a secondary user, no sync needed
      return null;
    }

    // Get the primary's settings for this group
    const primarySettings = await prisma.splitwiseSettings.findFirst({
      where: {
        userId: currentUser.primaryUserId,
        groupId: groupId,
        currencyCode: { not: null },
      },
      select: {
        currencyCode: true,
        defaultSplitRatio: true,
        user: {
          select: {
            firstName: true,
            name: true,
          },
        },
      },
    });

    if (primarySettings) {
      // Reverse the split ratio for the secondary
      let secondarySplitRatio = "1:1";
      if (primarySettings.defaultSplitRatio) {
        const [primaryShares, secondaryShares] =
          primarySettings.defaultSplitRatio.split(":");
        secondarySplitRatio = `${secondaryShares}:${primaryShares}`;
      }

      return {
        currencyCode: primarySettings.currencyCode,
        defaultSplitRatio: secondarySplitRatio,
        partnerName: getUserFirstName(primarySettings.user) || "Your partner",
      };
    }

    return null;
  } catch (error) {
    console.error("Error syncing from primary:", error);
    return null;
  }
}
