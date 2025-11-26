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
      include: {
        accounts: true,
        splitwiseSettings: true,
        ynabSettings: true,
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

    return {
      persona: user.persona as "solo" | "dual" | null,
      onboardingStep: user.onboardingStep,
      onboardingComplete: user.onboardingComplete,
      hasSplitwiseConnection,
      hasYnabSettings,
      hasSplitwiseSettings,
      ynabSettings: user.ynabSettings,
      splitwiseSettings: user.splitwiseSettings,
      userProfile: {
        name: user.name,
        email: user.email,
        image: user.image,
      },
    };
  } catch (error) {
    console.error("Failed to fetch user onboarding data:", error);
    return null;
  }
}
