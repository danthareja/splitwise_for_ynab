"use server";

import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { auth } from "@/auth";
import { prisma } from "@/db";
import {
  getSplitwiseGroups,
  getSplitwiseGroup,
  validateSplitwiseApiKey,
} from "@/services/splitwise-auth";
import {
  sendPartnerInviteEmail,
  sendPartnerDisconnectedEmail,
} from "@/services/email";
import { getSubscriptionStatus } from "@/services/stripe";
import {
  getUserFirstName,
  reverseSplitRatio,
  SUGGESTED_EMOJIS,
} from "@/lib/utils";
import type { SplitwiseUser, SplitwiseMember } from "@/types/splitwise";

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

/**
 * Check if the current user has access to a specific Splitwise group.
 * More efficient than fetching all groups - avoids pagination issues.
 */
export async function checkSplitwiseGroupAccess(groupId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      hasAccess: false,
      isValid: false,
      error: "You must be logged in",
    };
  }

  const apiKey = await getSplitwiseApiKey();

  if (!apiKey) {
    return {
      success: false,
      hasAccess: false,
      isValid: false,
      error: "No Splitwise API key found",
    };
  }

  const result = await getSplitwiseGroup(apiKey, groupId);

  if (!result.success || !result.group) {
    return {
      success: true, // The check itself succeeded
      hasAccess: false,
      isValid: false,
      error: result.error,
    };
  }

  // Group exists and user has access - check if it's valid (exactly 2 members)
  const isValid = result.group.members.length === 2;

  return {
    success: true,
    hasAccess: true,
    isValid,
    group: result.group,
  };
}

// Get partner info from a Splitwise group (the other member who isn't the current user)
export async function getPartnerFromGroup(groupId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const apiKey = await getSplitwiseApiKey();
  if (!apiKey) {
    return { success: false, error: "No Splitwise API key found" };
  }

  try {
    const result = await getSplitwiseGroups(apiKey);
    if (!result.success || !result.groups) {
      return {
        success: false,
        error: result.error || "Failed to fetch groups",
      };
    }

    const group = result.groups.find((g) => g.id.toString() === groupId);
    if (!group) {
      return { success: false, error: "Group not found" };
    }

    // Get the current user's Splitwise account to find their ID
    const account = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: "splitwise",
      },
    });

    if (!account?.providerAccountId) {
      return { success: false, error: "Splitwise account not found" };
    }

    const currentSplitwiseId = account.providerAccountId;

    // Find the partner (the member who isn't the current user)
    const partner = group.members.find(
      (member: SplitwiseMember) => member.id.toString() !== currentSplitwiseId,
    );

    if (!partner) {
      return { success: false, error: "No partner found in group" };
    }

    return {
      success: true,
      partner: {
        id: partner.id,
        firstName: partner.first_name,
        lastName: partner.last_name,
        email: partner.email,
        image: partner.picture?.medium,
      },
      groupName: group.name,
    };
  } catch (error) {
    console.error("Error getting partner from group:", error);
    Sentry.captureException(error);
    return { success: false, error: "Failed to get partner info" };
  }
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

    // For group sync: update partner regardless of their current group
    // (this allows group changes to propagate to secondary)
    const partnerSettings = await prisma.splitwiseSettings.findFirst({
      where: {
        userId: partnerId,
      },
      include: {
        user: true,
      },
    });

    if (!partnerSettings) {
      return { success: true, updatedPartners: [] };
    }

    // Reverse the split ratio for partner (if user has 2:1, partner gets 1:2)
    const partnerSplitRatio = reverseSplitRatio(splitRatio);

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
    Sentry.captureException(error);
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

    // For currency sync: update partner regardless of their current group
    // (this allows group changes to propagate to secondary)
    const partnerSettings = await prisma.splitwiseSettings.findFirst({
      where: {
        userId: partnerId,
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
    Sentry.captureException(error);
    return { success: false, error: "Failed to sync currency with partner" };
  }
}

// Synchronize group change with household partner (primary → secondary only)
// When primary changes to a new group, update secondary's group settings
// If secondary is not in the new group, they become fully orphaned (unlinked from primary)
async function syncGroupWithSecondary(
  userId: string,
  newGroupId: string,
  newGroupName: string | null,
  currencyCode: string,
  splitRatio: string,
  forceOrphan: boolean = false,
) {
  try {
    // Get the current user (primary) and their secondary
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        name: true,
        secondaryUser: {
          select: {
            id: true,
            firstName: true,
            name: true,
            email: true,
          },
        },
        splitwiseSettings: {
          select: {
            groupName: true,
          },
        },
      },
    });

    if (!currentUser?.secondaryUser) {
      return { success: true, synced: false };
    }

    const secondary = currentUser.secondaryUser;
    const secondaryEmail = secondary.email;
    const primaryName = getUserFirstName(currentUser) || "Your partner";
    const oldGroupName = currentUser.splitwiseSettings?.groupName || undefined;

    // Helper to fully orphan the secondary user and notify them
    const orphanSecondary = async () => {
      // Fully unlink the secondary from the primary:
      // 1. Clear their group settings
      // 2. Unlink them from the primary (set primaryUserId to null)
      // 3. Set them to solo mode
      // 4. Reset onboarding so they can reconfigure
      await prisma.$transaction([
        prisma.splitwiseSettings.update({
          where: { userId: secondary.id },
          data: {
            groupId: null,
            groupName: null,
            currencyCode: null,
            defaultSplitRatio: null,
            lastPartnerSyncAt: new Date(),
          },
        }),
        prisma.user.update({
          where: { id: secondary.id },
          data: {
            primaryUserId: null,
            persona: "solo",
            onboardingStep: 3, // Configure Splitwise step
            onboardingComplete: false,
          },
        }),
      ]);

      // Send email notification to the orphaned secondary
      if (secondaryEmail) {
        try {
          await sendPartnerDisconnectedEmail({
            to: secondaryEmail,
            userName: getUserFirstName(secondary) || undefined,
            primaryName,
            oldGroupName,
          });
        } catch (emailError) {
          console.error(
            "Failed to send partner disconnected email:",
            emailError,
          );
          Sentry.captureException(emailError);
          // Don't fail the overall operation if email fails
        }
      }

      return {
        success: true,
        synced: false,
        orphaned: true,
        secondaryName: secondary.firstName || secondary.name || "Partner",
      };
    };

    // If forceOrphan is true, we orphan the secondary regardless of group membership
    if (forceOrphan) {
      return await orphanSecondary();
    }

    // Check if secondary is in the new group
    const apiKey = await getSplitwiseApiKey();
    if (!apiKey || !secondaryEmail) {
      // Can't verify, update their settings anyway
      await updateSecondaryGroupSettings(
        secondary.id,
        newGroupId,
        newGroupName,
        currencyCode,
        splitRatio,
      );
      return {
        success: true,
        synced: true,
        secondaryName: secondary.firstName || secondary.name || "Partner",
      };
    }

    const result = await getSplitwiseGroup(apiKey, newGroupId);

    if (!result.success || !result.group) {
      // Can't fetch group, update their settings anyway
      await updateSecondaryGroupSettings(
        secondary.id,
        newGroupId,
        newGroupName,
        currencyCode,
        splitRatio,
      );
      return {
        success: true,
        synced: true,
        secondaryName: secondary.firstName || secondary.name || "Partner",
      };
    }

    const secondaryInGroup = result.group.members.some(
      (member: SplitwiseMember) =>
        member.email.toLowerCase() === secondaryEmail.toLowerCase(),
    );

    if (secondaryInGroup) {
      // Secondary is in the new group, update their settings
      await updateSecondaryGroupSettings(
        secondary.id,
        newGroupId,
        newGroupName,
        currencyCode,
        splitRatio,
      );
      return {
        success: true,
        synced: true,
        secondaryName: secondary.firstName || secondary.name || "Partner",
      };
    } else {
      // Secondary is NOT in the new group - fully orphan them
      return await orphanSecondary();
    }
  } catch (error) {
    console.error("Error syncing group with secondary:", error);
    Sentry.captureException(error);
    return { success: false, error: "Failed to sync group with partner" };
  }
}

// Expire pending invites if the invited person is not in the new group
// Called when primary changes their Splitwise group
async function expireInviteIfNotInGroup(
  primaryUserId: string,
  newGroupId: string,
) {
  try {
    // Get pending invite for this primary
    const invite = await prisma.partnerInvite.findFirst({
      where: {
        primaryUserId,
        status: "pending",
        expiresAt: { gt: new Date() },
      },
    });

    if (!invite) {
      return { success: true, expired: false };
    }

    const inviteeEmail = invite.partnerEmail;
    if (!inviteeEmail) {
      // No email on invite, can't check - don't expire
      return { success: true, expired: false };
    }

    // Get the API key to check group membership
    const apiKey = await getSplitwiseApiKey();
    if (!apiKey) {
      return { success: true, expired: false };
    }

    // Check if invitee is in the new group
    const result = await getSplitwiseGroup(apiKey, newGroupId);
    if (!result.success || !result.group) {
      return { success: true, expired: false };
    }

    const inviteeInGroup = result.group.members.some(
      (member: SplitwiseMember) =>
        member.email.toLowerCase() === inviteeEmail.toLowerCase(),
    );

    if (!inviteeInGroup) {
      // Invitee is NOT in the new group - expire the invite
      await prisma.partnerInvite.update({
        where: { id: invite.id },
        data: { status: "expired" },
      });

      return {
        success: true,
        expired: true,
        inviteeName: invite.partnerName || inviteeEmail,
      };
    }

    // Invitee IS in the new group - update the invite with new group info
    await prisma.partnerInvite.update({
      where: { id: invite.id },
      data: {
        groupId: newGroupId,
        groupName: result.group.name,
      },
    });

    return { success: true, expired: false, updated: true };
  } catch (error) {
    console.error("Error checking/expiring invite:", error);
    Sentry.captureException(error);
    return { success: false, error: "Failed to check invite" };
  }
}

// Helper to update secondary user's group settings
async function updateSecondaryGroupSettings(
  secondaryId: string,
  groupId: string,
  groupName: string | null,
  currencyCode: string,
  splitRatio: string,
) {
  // Secondary gets the reversed split ratio
  const secondarySplitRatio = reverseSplitRatio(splitRatio);

  await prisma.splitwiseSettings.update({
    where: { userId: secondaryId },
    data: {
      groupId,
      groupName,
      currencyCode,
      defaultSplitRatio: secondarySplitRatio,
      lastPartnerSyncAt: new Date(),
    },
  });
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
            error: `This group is already used by ${existingUserName}. To share this group, ask them to invite you to their Duo account.`,
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

    // Check if this user is a primary with a secondary
    const hasSecondary = currentUser?.secondaryUser?.id;

    // If group changed and user is primary, sync group with secondary
    let groupSyncResult: {
      success: boolean;
      synced?: boolean;
      orphaned?: boolean;
      secondaryName?: string;
      error?: string;
    } = { success: true, synced: false };

    if (isGroupChanged && hasSecondary) {
      groupSyncResult = await syncGroupWithSecondary(
        session.user.id,
        groupId,
        groupName,
        finalCurrencyCode,
        finalSplitRatio,
      );
    }

    // If group changed and user has a pending invite, check if invite should be expired
    let inviteExpireResult: {
      success: boolean;
      expired?: boolean;
      updated?: boolean;
      inviteeName?: string;
      error?: string;
    } = { success: true, expired: false };

    if (isGroupChanged && !hasSecondary) {
      // Only check for pending invites if there's no secondary
      // (if there's a secondary, they take precedence)
      inviteExpireResult = await expireInviteIfNotInGroup(
        session.user.id,
        groupId,
      );
    }

    // If currency code changed (but group didn't), sync with household partner
    let currencySyncResult: {
      success: boolean;
      updatedPartners?: string[];
      error?: string;
    } = { success: true, updatedPartners: [] };
    if (isCurrencyChanged && !isGroupChanged && finalCurrencyCode) {
      currencySyncResult = await syncCurrencyWithPartner(
        session.user.id,
        groupId,
        finalCurrencyCode,
      );
    }

    // If split ratio changed (but group didn't), sync with household partner
    let splitRatioSyncResult: {
      success: boolean;
      updatedPartners?: string[];
      error?: string;
    } = { success: true, updatedPartners: [] };
    if (isSplitRatioChanged && !isGroupChanged && finalSplitRatio) {
      splitRatioSyncResult = await syncSplitRatioWithPartner(
        session.user.id,
        groupId,
        finalSplitRatio,
      );
    }

    revalidatePath("/dashboard");

    // Build response with appropriate sync information
    const result: {
      success: boolean;
      currencySynced?: boolean;
      splitRatioSynced?: boolean;
      groupSynced?: boolean;
      partnerOrphaned?: boolean;
      orphanedPartnerName?: string;
      inviteExpired?: boolean;
      expiredInviteeName?: string;
      partnerSyncMessage?: string;
      updatedPartners?: string[];
    } = {
      success: true,
      currencySynced: (currencySyncResult.updatedPartners ?? []).length > 0,
      splitRatioSynced: (splitRatioSyncResult.updatedPartners ?? []).length > 0,
      groupSynced: groupSyncResult.synced ?? false,
      partnerOrphaned: groupSyncResult.orphaned ?? false,
      orphanedPartnerName: groupSyncResult.secondaryName,
      inviteExpired: inviteExpireResult.expired ?? false,
      expiredInviteeName: inviteExpireResult.inviteeName,
      partnerSyncMessage: partnerSyncMessage || undefined,
      updatedPartners: [
        ...(currencySyncResult.updatedPartners ?? []),
        ...(splitRatioSyncResult.updatedPartners ?? []),
        ...(groupSyncResult.synced && groupSyncResult.secondaryName
          ? [groupSyncResult.secondaryName]
          : []),
      ],
    };

    return result;
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
        error:
          "This Duo account already has a partner. Please have your partner reach out to support.",
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
    // Secondary gets the REVERSED split ratio (if primary has 2:1, secondary gets 1:2)
    const secondarySplitRatio = reverseSplitRatio(
      primarySettings.defaultSplitRatio,
    );

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
          defaultSplitRatio: secondarySplitRatio,
          emoji: emoji,
          // useDescriptionAsPayee defaults to true
          // customPayeeName stays null - user can configure their own
        },
        update: {
          groupId: primarySettings.groupId,
          groupName: primarySettings.groupName,
          currencyCode: primarySettings.currencyCode,
          defaultSplitRatio: secondarySplitRatio,
          emoji: emoji,
        },
      }),
    ]);

    return { success: true };
  } catch (error) {
    console.error("Error joining household:", error);
    Sentry.captureException(error);
    return { success: false, error: "Failed to join Duo account" };
  }
}

// Generate a partner invite token for streamlined secondary setup
// Can accept settings directly (for onboarding when not yet saved) or read from DB
export async function createPartnerInvite(options?: {
  settings?: {
    groupId: string;
    groupName?: string | null;
    currencyCode: string;
    emoji: string;
    defaultSplitRatio?: string;
  };
  partnerEmail?: string;
  partnerName?: string;
  sendEmail?: boolean;
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
    if (!options?.settings && user.persona !== "dual") {
      return {
        success: false,
        error: `Only dual users can create partner invites (current: ${user.persona || "none"})`,
      };
    }

    if (user.secondaryUser) {
      return { success: false, error: "You already have a partner connected" };
    }

    // For existing users (not during onboarding), verify they have an active subscription
    // During onboarding (options?.settings provided), skip this check - payment happens after
    if (!options?.settings) {
      const subscriptionStatus = await getSubscriptionStatus(session.user.id);
      if (!subscriptionStatus.isActive) {
        return {
          success: false,
          error:
            "You need an active subscription to invite a partner. Please update your billing settings.",
          requiresSubscription: true,
        };
      }
    }

    // Use provided settings or fall back to database
    const effectiveSettings = options?.settings || user.splitwiseSettings;

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
      options?.settings?.defaultSplitRatio ||
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
        partnerEmail: options?.partnerEmail || null,
        partnerName: options?.partnerName || null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Send email if requested and partner email is provided
    let emailSent = false;
    if (options?.sendEmail && options?.partnerEmail) {
      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      const inviteUrl = `${baseUrl}/invite/${token}`;
      const inviterName = getUserFirstName(user) || "Your partner";

      const emailResult = await sendPartnerInviteEmail({
        to: options.partnerEmail,
        partnerName: options.partnerName || undefined,
        inviterName,
        groupName: effectiveSettings.groupName || undefined,
        inviteUrl,
      });

      if (emailResult.success) {
        emailSent = true;
        // Update invite with email sent timestamp
        await prisma.partnerInvite.update({
          where: { token },
          data: { emailSentAt: new Date() },
        });
      }
    }

    return {
      success: true,
      token: invite.token,
      expiresAt: invite.expiresAt,
      emailSent,
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

// Maximum number of reminder emails that can be sent for a single invite
const MAX_INVITE_REMINDERS = 3;

// Resend partner invite email (optionally with a new email address)
export async function resendPartnerInvite(newEmail?: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    // Get existing pending invite
    const invite = await prisma.partnerInvite.findFirst({
      where: {
        primaryUserId: session.user.id,
        status: "pending",
        expiresAt: { gt: new Date() },
      },
    });

    if (!invite) {
      return { success: false, error: "No pending invite found" };
    }

    // Check reminder limit
    if (invite.emailReminderCount >= MAX_INVITE_REMINDERS) {
      return {
        success: false,
        error: `Maximum reminders reached (${MAX_INVITE_REMINDERS}). The invite expires in ${Math.ceil((invite.expiresAt.getTime() - Date.now()) / 86400000)} days.`,
        maxRemindersReached: true,
      };
    }

    // Use new email or existing
    const partnerEmail = newEmail || invite.partnerEmail;
    if (!partnerEmail) {
      return { success: false, error: "No email address provided" };
    }

    // Get current user info for the email
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const inviteUrl = `${baseUrl}/invite/${invite.token}`;
    const inviterName = getUserFirstName(user) || "Your partner";

    const emailResult = await sendPartnerInviteEmail({
      to: partnerEmail,
      partnerName: invite.partnerName || undefined,
      inviterName,
      groupName: invite.groupName || undefined,
      inviteUrl,
    });

    if (!emailResult.success) {
      return { success: false, error: "Failed to send email" };
    }

    // Update invite with new email and sent timestamp
    await prisma.partnerInvite.update({
      where: { id: invite.id },
      data: {
        partnerEmail,
        emailSentAt: new Date(),
        emailReminderCount: { increment: 1 },
      },
    });

    revalidatePath("/dashboard");

    return { success: true, email: partnerEmail };
  } catch (error) {
    console.error("Error resending partner invite:", error);
    Sentry.captureException(error);
    return { success: false, error: "Failed to resend invite" };
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
        partnerEmail: true,
        partnerName: true,
        emailSentAt: true,
        emailReminderCount: true,
        groupName: true,
      },
    });

    if (!invite) return null;

    return {
      ...invite,
      maxReminders: MAX_INVITE_REMINDERS,
    };
  } catch (error) {
    console.error("Error getting existing invite:", error);
    Sentry.captureException(error);
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
      return {
        success: false,
        error:
          "This invite has already been used. Please reach out to your partner to get a new invite.",
      };
    }

    if (invite.expiresAt < new Date()) {
      return {
        success: false,
        error:
          "This invite has expired. Please reach out to your partner to get a new invite.",
      };
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
      return {
        success: false,
        error:
          "This invite has already been used. Please reach out to your partner to get a new invite.",
      };
    }

    if (invite.expiresAt < new Date()) {
      return {
        success: false,
        error:
          "This invite has expired. Please reach out to your partner to get a new invite.",
      };
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
      return {
        success: false,
        error:
          "Primary user no longer exists. Please sign up for a new account from our homepage.",
      };
    }

    if (primaryUser.secondaryUser) {
      return {
        success: false,
        error:
          "This Duo account already has a partner. Please have your partner reach out to support.",
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
    // Secondary gets the REVERSED split ratio (if primary has 2:1, secondary gets 1:2)
    const secondarySplitRatio = reverseSplitRatio(
      primarySettings.defaultSplitRatio,
    );

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
          defaultSplitRatio: secondarySplitRatio,
          emoji: emoji,
          // useDescriptionAsPayee defaults to true
          // customPayeeName stays null - user can configure their own
        },
        update: {
          groupId: primarySettings.groupId,
          groupName: primarySettings.groupName,
          currencyCode: primarySettings.currencyCode,
          defaultSplitRatio: secondarySplitRatio,
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

// Link user as secondary via invite
// For new users: they go through normal onboarding
// For existing fully-configured solo users: they're linked directly without re-onboarding
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
      return {
        success: false,
        error:
          "This invite has already been used. Please reach out to your partner to get a new invite.",
      };
    }

    if (invite.expiresAt < new Date()) {
      return {
        success: false,
        error:
          "This invite has expired. Please reach out to your partner to get a new invite.",
      };
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
      return {
        success: false,
        error:
          "Primary user no longer exists. Please sign up for a new account from our homepage.",
      };
    }

    if (primaryUser.secondaryUser) {
      return {
        success: false,
        error:
          "This Duo account already has a partner. Please have your partner reach out to support.",
      };
    }

    // Verify primary has an active subscription - secondary inherits from primary
    const primarySubscription = await getSubscriptionStatus(
      invite.primaryUserId,
    );
    if (!primarySubscription.isActive) {
      return {
        success: false,
        error:
          "Your partner's subscription is not active. Please ask them to update their billing settings before you can join their plan.",
        requiresSubscription: true,
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

    // Check if current user is an existing fully-configured solo user
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        accounts: true,
        ynabSettings: true,
        splitwiseSettings: true,
      },
    });

    const hasSplitwiseAccount = currentUser?.accounts.some(
      (a) => a.provider === "splitwise",
    );
    const hasYnabAccount = currentUser?.accounts.some(
      (a) => a.provider === "ynab",
    );
    const hasYnabSettings = !!(
      currentUser?.ynabSettings?.budgetId &&
      currentUser?.ynabSettings?.splitwiseAccountId
    );

    // User is fully configured if they have both accounts and YNAB settings
    const isFullyConfigured =
      hasSplitwiseAccount && hasYnabAccount && hasYnabSettings;

    if (isFullyConfigured) {
      // Existing fully-configured solo user - link directly without re-onboarding
      // Get the emoji from their current settings (or use a default that's different from primary)
      const currentEmoji = currentUser?.splitwiseSettings?.emoji;
      let newEmoji = currentEmoji || "✅";

      // If emoji conflicts with primary, pick a different one
      if (newEmoji === primarySettings.emoji) {
        newEmoji =
          SUGGESTED_EMOJIS.find((e) => e !== primarySettings.emoji) || "🔄";
      }

      const secondarySplitRatio = reverseSplitRatio(
        primarySettings.defaultSplitRatio,
      );

      await prisma.$transaction([
        prisma.user.update({
          where: { id: session.user.id },
          data: {
            primaryUserId: invite.primaryUserId,
            persona: "dual",
            // Keep onboardingComplete: true since they're already configured
            onboardingComplete: true,
          },
        }),
        // Update their SplitwiseSettings to match primary's group
        prisma.splitwiseSettings.upsert({
          where: { userId: session.user.id },
          create: {
            userId: session.user.id,
            groupId: primarySettings.groupId,
            groupName: primarySettings.groupName,
            currencyCode: primarySettings.currencyCode,
            defaultSplitRatio: secondarySplitRatio,
            emoji: newEmoji,
            useDescriptionAsPayee:
              currentUser?.splitwiseSettings?.useDescriptionAsPayee ?? true,
            customPayeeName:
              currentUser?.splitwiseSettings?.customPayeeName || null,
          },
          update: {
            groupId: primarySettings.groupId,
            groupName: primarySettings.groupName,
            currencyCode: primarySettings.currencyCode,
            defaultSplitRatio: secondarySplitRatio,
            emoji: newEmoji,
            // Keep their existing payee preferences
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

      return { success: true, skipOnboarding: true };
    }

    // New or partially configured user - go through normal onboarding
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

    return { success: true, skipOnboarding: false };
  } catch (error) {
    console.error("Error linking as secondary:", error);
    Sentry.captureException(error);
    return { success: false, error: "Failed to join Duo account" };
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

// Check if a specific user (by email) is a member of a Splitwise group
// Called when primary changes group to see if secondary is in the new group
export async function checkUserInGroup(groupId: string, userEmail: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const apiKey = await getSplitwiseApiKey();
  if (!apiKey) {
    return { success: false, error: "No Splitwise API key found" };
  }

  try {
    const result = await getSplitwiseGroup(apiKey, groupId);

    if (!result.success || !result.group) {
      return {
        success: false,
        error: result.error || "Could not fetch group",
      };
    }

    // Check if the user's email is in the group members
    const isMember = result.group.members.some(
      (member: SplitwiseMember) =>
        member.email.toLowerCase() === userEmail.toLowerCase(),
    );

    return {
      success: true,
      isMember,
      groupName: result.group.name,
    };
  } catch (error) {
    console.error("Error checking user in group:", error);
    Sentry.captureException(error);
    return { success: false, error: "Failed to check group membership" };
  }
}

// Check if a pending invite will be expired when changing to a specific group
// Returns info about whether the invite will be cancelled
export async function checkInviteInGroup(groupId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, hasInvite: false };
  }

  try {
    // Get pending invite for this user
    const invite = await prisma.partnerInvite.findFirst({
      where: {
        primaryUserId: session.user.id,
        status: "pending",
        expiresAt: { gt: new Date() },
      },
      select: {
        partnerEmail: true,
        partnerName: true,
      },
    });

    if (!invite) {
      return { success: true, hasInvite: false };
    }

    const inviteeEmail = invite.partnerEmail;
    if (!inviteeEmail) {
      // No email on invite, can't check
      return {
        success: true,
        hasInvite: true,
        inviteeInGroup: true, // Assume they're in the group if we can't check
        inviteeName: invite.partnerName || "Partner",
      };
    }

    // Get the API key to check group membership
    const apiKey = await getSplitwiseApiKey();
    if (!apiKey) {
      return { success: false, error: "No Splitwise API key found" };
    }

    const result = await getSplitwiseGroup(apiKey, groupId);
    if (!result.success || !result.group) {
      return {
        success: false,
        error: result.error || "Could not fetch group",
      };
    }

    const inviteeInGroup = result.group.members.some(
      (member: SplitwiseMember) =>
        member.email.toLowerCase() === inviteeEmail.toLowerCase(),
    );

    return {
      success: true,
      hasInvite: true,
      inviteeInGroup,
      inviteeName: invite.partnerName || inviteeEmail,
      groupName: result.group.name,
    };
  } catch (error) {
    console.error("Error checking invite in group:", error);
    Sentry.captureException(error);
    return { success: false, error: "Failed to check invite" };
  }
}

// Check if the primary's secondary user is in a specific Splitwise group
// Returns info about whether the secondary will be orphaned if primary changes to this group
export async function checkSecondaryInGroup(groupId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, hasSecondary: false };
  }

  try {
    // Get the current user and their secondary
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        secondaryUser: {
          select: {
            id: true,
            firstName: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!user?.secondaryUser) {
      // No secondary user, no check needed
      return { success: true, hasSecondary: false };
    }

    const secondaryEmail = user.secondaryUser.email;
    if (!secondaryEmail) {
      // Can't check without email, assume they're in the group
      return {
        success: true,
        hasSecondary: true,
        secondaryInGroup: true,
        secondaryName:
          user.secondaryUser.firstName || user.secondaryUser.name || "Partner",
      };
    }

    // Check if secondary is in the group
    const apiKey = await getSplitwiseApiKey();
    if (!apiKey) {
      return { success: false, error: "No Splitwise API key found" };
    }

    const result = await getSplitwiseGroup(apiKey, groupId);

    if (!result.success || !result.group) {
      return {
        success: false,
        error: result.error || "Could not fetch group",
      };
    }

    const secondaryInGroup = result.group.members.some(
      (member: SplitwiseMember) =>
        member.email.toLowerCase() === secondaryEmail.toLowerCase(),
    );

    return {
      success: true,
      hasSecondary: true,
      secondaryInGroup,
      secondaryName:
        user.secondaryUser.firstName || user.secondaryUser.name || "Partner",
      secondaryEmail,
      groupName: result.group.name,
    };
  } catch (error) {
    console.error("Error checking secondary in group:", error);
    Sentry.captureException(error);
    return { success: false, error: "Failed to check partner membership" };
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
      const secondarySplitRatio = reverseSplitRatio(
        primarySettings.defaultSplitRatio,
      );

      return {
        currencyCode: primarySettings.currencyCode,
        defaultSplitRatio: secondarySplitRatio,
        partnerName: getUserFirstName(primarySettings.user) || "Your partner",
      };
    }

    return null;
  } catch (error) {
    console.error("Error syncing from primary:", error);
    Sentry.captureException(error);
    return null;
  }
}
