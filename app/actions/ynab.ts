"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/db";
import {
  getYNABBudgets,
  getYNABAccounts,
  createYNABAccount,
  type YNABBudgetsResult,
  type YNABAccountsResult,
  type YNABAccountResult,
} from "@/services/ynab-api";

export async function getYNABBudgetsForUser(): Promise<YNABBudgetsResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      error: "You must be logged in to fetch budgets",
    };
  }

  return await getYNABBudgets();
}

export async function getYNABAccountsForBudget(
  budgetId: string,
): Promise<YNABAccountsResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      error: "You must be logged in to fetch accounts",
    };
  }

  return await getYNABAccounts(budgetId);
}

export async function createYNABAccountForUser(
  budgetId: string,
  name?: string,
): Promise<YNABAccountResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      error: "You must be logged in to create an account",
    };
  }

  return await createYNABAccount(budgetId, name);
}

export async function saveYNABSettings(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      error: "You must be logged in to save settings",
    };
  }

  const budgetId = formData.get("budgetId") as string;
  const budgetName = formData.get("budgetName") as string;
  const splitwiseAccountId = formData.get("splitwiseAccountId") as string;
  const splitwiseAccountName = formData.get("splitwiseAccountName") as string;
  const manualFlagColor = formData.get("manualFlagColor") as string;
  const syncedFlagColor = formData.get("syncedFlagColor") as string;

  if (!budgetId || !splitwiseAccountId) {
    return {
      success: false,
      error: "Budget and Splitwise account are required",
    };
  }

  // Make sure manual and synced flag colors are different
  if (manualFlagColor === syncedFlagColor) {
    return {
      success: false,
      error: "Manual flag color and synced flag color must be different",
      isFlagColorConflict: true,
    };
  }

  try {
    await prisma.ynabSettings.upsert({
      where: { userId: session.user.id },
      update: {
        budgetId,
        budgetName,
        splitwiseAccountId,
        splitwiseAccountName,
        manualFlagColor: manualFlagColor || "blue",
        syncedFlagColor: syncedFlagColor || "green",
      },
      create: {
        userId: session.user.id,
        budgetId,
        budgetName,
        splitwiseAccountId,
        splitwiseAccountName,
        manualFlagColor: manualFlagColor || "blue",
        syncedFlagColor: syncedFlagColor || "green",
      },
    });

    revalidatePath("/dashboard");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error saving YNAB settings:", error);
    return {
      success: false,
      error: "Failed to save YNAB settings",
    };
  }
}

export async function getYNABSettings() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  try {
    const settings = await prisma.ynabSettings.findUnique({
      where: { userId: session.user.id },
    });

    return settings;
  } catch (error) {
    console.error("Error getting YNAB settings:", error);
    return null;
  }
}
