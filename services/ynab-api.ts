import axios from "axios";
import { auth } from "@/auth";
import { addStackToAxios } from "./utils";
import { prisma } from "@/db"; // Declare the prisma variable

export interface YnabBudget {
  id: string;
  name: string;
  last_modified_on: string;
  first_month: string;
  last_month: string;
  currency_format: {
    iso_code: string;
    example_format: string;
    decimal_digits: number;
    decimal_separator: string;
    symbol_first: boolean;
    group_separator: string;
    currency_symbol: string;
    display_symbol: boolean;
  };
}

export interface YnabAccount {
  id: string;
  name: string;
  type: string;
  on_budget: boolean;
  closed: boolean;
  note: string | null;
  balance: number;
  cleared_balance: number;
  uncleared_balance: number;
  transfer_payee_id: string;
  direct_import_linked: boolean;
  direct_import_in_error: boolean;
  deleted: boolean;
}

export interface YnabTransaction {
  id: string;
  date: string;
  amount: number;
  memo: string | null;
  cleared: string;
  approved: boolean;
  flag_color: string | null;
  account_id: string;
  account_name: string;
  payee_id: string | null;
  payee_name: string | null;
  category_id: string | null;
  category_name: string | null;
  transfer_account_id: string | null;
  transfer_transaction_id: string | null;
  matched_transaction_id: string | null;
  import_id: string | null;
  deleted: boolean;
  subtransactions: unknown[];
}

export interface YnabFlagColor {
  id: string;
  name: string;
  color: string;
}

// Available flag colors in YNAB
export const FLAG_COLORS: YnabFlagColor[] = [
  { id: "red", name: "Red", color: "#ea5e5e" },
  { id: "orange", name: "Orange", color: "#f8a058" },
  { id: "yellow", name: "Yellow", color: "#f8df58" },
  { id: "green", name: "Green", color: "#8ec648" },
  { id: "blue", name: "Blue", color: "#3cb5e5" },
  { id: "purple", name: "Purple", color: "#9768d1" },
];

// Return types for service functions
export type YnabBudgetsResult =
  | { success: true; budgets: YnabBudget[] }
  | { success: false; error: string };

export type YnabAccountsResult =
  | { success: true; accounts: YnabAccount[] }
  | { success: false; error: string };

export type YnabAccountResult =
  | { success: true; account: YnabAccount }
  | { success: false; error: string };

export async function getYnabAccessToken() {
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

export async function getYnabBudgets(): Promise<YnabBudgetsResult> {
  try {
    const accessToken = await getYnabAccessToken();

    const axiosInstance = axios.create({
      baseURL: "https://api.youneedabudget.com/v1",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    addStackToAxios(axiosInstance);

    const response = await axiosInstance.get("/budgets");
    return {
      success: true,
      budgets: response.data.data.budgets as YnabBudget[],
    };
  } catch (error) {
    console.error("Error fetching YNAB budgets:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch YNAB budgets",
    };
  }
}

export async function getYnabAccounts(
  budgetId: string,
): Promise<YnabAccountsResult> {
  try {
    const accessToken = await getYnabAccessToken();

    const axiosInstance = axios.create({
      baseURL: "https://api.youneedabudget.com/v1",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    addStackToAxios(axiosInstance);

    const response = await axiosInstance.get(`/budgets/${budgetId}/accounts`);

    // Filter to only include on-budget and non-deleted accounts
    const accounts = response.data.data.accounts.filter(
      (account: YnabAccount) =>
        account.on_budget && !account.deleted && !account.closed,
    );

    return {
      success: true,
      accounts: accounts as YnabAccount[],
    };
  } catch (error) {
    console.error("Error fetching YNAB accounts:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch YNAB accounts",
    };
  }
}

export async function createYnabAccount(
  budgetId: string,
  name = "🤝 Splitwise",
): Promise<YnabAccountResult> {
  try {
    const accessToken = await getYnabAccessToken();

    const axiosInstance = axios.create({
      baseURL: "https://api.youneedabudget.com/v1",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    addStackToAxios(axiosInstance);

    const response = await axiosInstance.post(`/budgets/${budgetId}/accounts`, {
      account: {
        name,
        type: "cash", // Splitwise is a cash account
        balance: 0, // Start with zero balance
      },
    });

    return {
      success: true,
      account: response.data.data.account as YnabAccount,
    };
  } catch (error) {
    console.error("Error creating YNAB account:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create YNAB account",
    };
  }
}
