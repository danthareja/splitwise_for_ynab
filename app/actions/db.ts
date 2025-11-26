"use server";

import { prisma } from "@/db"; // Assuming your prisma client is exported from lib/db.ts
import { auth } from "@/auth"; // Assuming you have auth configured

export async function getUserWithAccounts() {
  const session = await auth();
  if (!session?.user?.id) {
    // Handle unauthorized access or return null/error
    // Depending on your error handling strategy
    console.error("User not authenticated");
    return null;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        accounts: true,
      },
    });
    return user;
  } catch (error) {
    console.error("Failed to fetch user with accounts:", error);
    // Optionally, rethrow the error or return a specific error object
    return null;
  }
}

export async function isUserFullyConfigured(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        accounts: true,
        splitwiseSettings: true,
        ynabSettings: true,
      },
    });

    if (!user) {
      return false;
    }

    // Check if the user has a Splitwise account connected
    const hasSplitwiseConnected = user.accounts.some(
      (account) => account.provider === "splitwise",
    );

    // Check if the user has a YNAB account connected
    const hasYNABConnected = user.accounts.some(
      (account) => account.provider === "ynab",
    );

    // Check if user is fully configured
    const isFullyConfigured =
      hasSplitwiseConnected &&
      hasYNABConnected &&
      user.splitwiseSettings &&
      user.ynabSettings;

    return isFullyConfigured;
  } catch (error) {
    console.error("Failed to check if user is fully configured:", error);
    return false;
  }
}

export async function getUserOnboardingData() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        persona: true,
        onboardingStep: true,
        onboardingComplete: true,
        primaryUserId: true,
        name: true,
        email: true,
        image: true,
        accounts: true,
        splitwiseSettings: true,
        ynabSettings: true,
        // Include primary user's settings for secondary users
        primaryUser: {
          select: {
            name: true,
            firstName: true,
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
        },
      },
    });

    if (!user) {
      return null;
    }

    const hasSplitwiseConnection = user.accounts.some(
      (account) => account.provider === "splitwise",
    );

    const hasYnabSettings = !!(
      user.ynabSettings?.budgetId && user.ynabSettings?.splitwiseAccountId
    );

    const hasSplitwiseSettings = !!(
      user.splitwiseSettings?.groupId && user.splitwiseSettings?.currencyCode
    );

    // Secondary users have a primaryUserId set
    const isSecondary = !!user.primaryUserId;

    // For secondary users, get primary's settings
    const primarySettings = isSecondary
      ? user.primaryUser?.splitwiseSettings
      : null;
    const primaryName = isSecondary
      ? user.primaryUser?.firstName || user.primaryUser?.name || "Your partner"
      : null;

    return {
      persona: user.persona as "solo" | "dual" | null,
      onboardingStep: user.onboardingStep,
      onboardingComplete: user.onboardingComplete,
      hasSplitwiseConnection,
      hasYnabSettings,
      hasSplitwiseSettings,
      isSecondary,
      ynabSettings: user.ynabSettings,
      splitwiseSettings: user.splitwiseSettings,
      userProfile: {
        name: user.name,
        email: user.email,
        image: user.image,
      },
      // For secondary users
      primarySettings,
      primaryName,
    };
  } catch (error) {
    console.error("Failed to fetch user onboarding data:", error);
    return null;
  }
}

export type PartnershipStatus =
  | { type: "solo" }
  | { type: "primary_waiting" } // Dual user waiting for partner to join
  | {
      type: "primary";
      secondaryName: string | null;
      secondaryEmail: string | null;
    }
  | {
      type: "secondary";
      primaryName: string | null;
      primaryEmail: string | null;
    }
  | { type: "orphaned" }; // Secondary with missing/deleted primary

// Unlink a secondary user from their primary (for orphan recovery)
export async function unlinkFromPrimary() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { primaryUserId: true },
    });

    if (!user?.primaryUserId) {
      return { success: false, error: "Not a secondary user" };
    }

    // Remove the link to primary and set persona to solo for reconfiguration
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        primaryUserId: null,
        persona: "solo",
        // Reset onboarding to step 3 (Configure Splitwise) so they can set up their own settings
        onboardingStep: 3,
        onboardingComplete: false,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to unlink from primary:", error);
    return { success: false, error: "Failed to unlink" };
  }
}

export async function getPartnershipStatus(): Promise<PartnershipStatus | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        persona: true,
        primaryUserId: true,
        primaryUser: {
          select: {
            id: true,
            name: true,
            firstName: true,
            email: true,
          },
        },
        secondaryUser: {
          select: {
            id: true,
            name: true,
            firstName: true,
            email: true,
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    // Check if this is a secondary user
    if (user.primaryUserId) {
      if (user.primaryUser) {
        return {
          type: "secondary",
          primaryName: user.primaryUser.firstName || user.primaryUser.name,
          primaryEmail: user.primaryUser.email,
        };
      } else {
        // Primary no longer exists - orphaned state
        return { type: "orphaned" };
      }
    }

    // Check if this is a primary with a secondary
    if (user.secondaryUser) {
      return {
        type: "primary",
        secondaryName: user.secondaryUser.firstName || user.secondaryUser.name,
        secondaryEmail: user.secondaryUser.email,
      };
    }

    // Check if this is a dual user waiting for their partner
    if (user.persona === "dual") {
      return { type: "primary_waiting" };
    }

    // Solo user (no partnership)
    return { type: "solo" };
  } catch (error) {
    console.error("Failed to fetch partnership status:", error);
    return null;
  }
}
