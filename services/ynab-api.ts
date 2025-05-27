import * as Sentry from "@sentry/nextjs";
import { auth } from "@/auth";
import { prisma } from "@/db";
import { createYNABAxios } from "./ynab-axios";
import { YNABBudget, YNABAccount, YNABFlagColor } from "../types/ynab";

// Return types for service functions
export type YNABBudgetsResult =
  | { success: true; budgets: YNABBudget[] }
  | { success: false; error: string };

export type YNABAccountsResult =
  | { success: true; accounts: YNABAccount[] }
  | { success: false; error: string };

export type YNABAccountResult =
  | { success: true; account: YNABAccount }
  | { success: false; error: string };

// Available flag colors in YNAB
export const FLAG_COLORS: YNABFlagColor[] = [
  { id: "red", name: "Red", color: "#ea5e5e" },
  { id: "orange", name: "Orange", color: "#f8a058" },
  { id: "yellow", name: "Yellow", color: "#f8df58" },
  { id: "green", name: "Green", color: "#8ec648" },
  { id: "blue", name: "Blue", color: "#3cb5e5" },
  { id: "purple", name: "Purple", color: "#9768d1" },
];

export async function getYNABBudgets(): Promise<YNABBudgetsResult> {
  try {
    const axiosInstance = await getYNABAxiosInstance();

    const response = await axiosInstance.get("/budgets");
    return {
      success: true,
      budgets: response.data.data.budgets as YNABBudget[],
    };
  } catch (error) {
    console.error("Error fetching YNAB budgets:", error);
    Sentry.captureException(error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch YNAB budgets",
    };
  }
}

export async function getYNABAccounts(
  budgetId: string,
): Promise<YNABAccountsResult> {
  try {
    const axiosInstance = await getYNABAxiosInstance();

    const response = await axiosInstance.get(`/budgets/${budgetId}/accounts`);

    // Filter to only include on-budget and non-deleted accounts
    const accounts = response.data.data.accounts.filter(
      (account: YNABAccount) =>
        account.on_budget && !account.deleted && !account.closed,
    );

    return {
      success: true,
      accounts: accounts as YNABAccount[],
    };
  } catch (error) {
    console.error("Error fetching YNAB accounts:", error);
    Sentry.captureException(error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch YNAB accounts",
    };
  }
}

export async function createYNABAccount(
  budgetId: string,
  name = "🤝 Splitwise",
): Promise<YNABAccountResult> {
  try {
    const axiosInstance = await getYNABAxiosInstance();

    const response = await axiosInstance.post(`/budgets/${budgetId}/accounts`, {
      account: {
        name,
        type: "cash", // Splitwise is a cash account
        balance: 0, // Start with zero balance
      },
    });

    return {
      success: true,
      account: response.data.data.account as YNABAccount,
    };
  } catch (error) {
    console.error("Error creating YNAB account:", error);
    Sentry.captureException(error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create YNAB account",
    };
  }
}

export async function getYNABAxiosInstance() {
  const accessToken = await getYNABAccessToken();
  return createYNABAxios({
    accessToken,
  });
}

export async function getYNABAccessToken() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("User not authenticated");
  }

  // Get the YNAB account from the database
  const account = await prisma.account.findFirst({
    where: {
      userId: session.user.id,
      provider: "ynab",
    },
  });

  if (!account?.access_token) {
    throw new Error("YNAB account not connected");
  }

  return account.access_token;
}
