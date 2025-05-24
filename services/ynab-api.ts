import axios from "axios";
import { auth } from "@/auth";
import { addStackToAxios } from "./utils";
import { prisma } from "@/db"; // Declare the prisma variable

// Extend the request config type to include our retry flag
declare module "axios" {
  interface AxiosRequestConfig {
    _retry?: boolean;
  }
}

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
    const axiosInstance = await getYnabAxiosInstance();

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
    const axiosInstance = await getYnabAxiosInstance();

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
    const axiosInstance = await getYnabAxiosInstance();

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

export async function refreshYnabAccessToken() {
  console.log("🔄 Starting YNAB access token refresh process");

  const session = await auth();

  if (!session?.user?.id) {
    console.error("❌ Token refresh failed: User not authenticated");
    throw new Error("User not authenticated");
  }

  console.log(`🔍 Looking up YNAB account for user: ${session.user.id}`);

  // Get the YNAB account from the database
  const account = await prisma.account.findFirst({
    where: {
      userId: session.user.id,
      provider: "ynab",
    },
  });

  if (!account?.refresh_token) {
    console.error(
      "❌ Token refresh failed: YNAB refresh token not found in database",
    );
    throw new Error("YNAB refresh token not found");
  }

  console.log(`✅ Found YNAB account with ID: ${account.id}`);
  console.log(
    `🔑 Refresh token available (length: ${account.refresh_token.length})`,
  );

  try {
    console.log("📡 Making request to YNAB OAuth refresh endpoint");

    // Use YNAB's OAuth refresh endpoint
    const response = await axios.post(
      "https://app.youneedabudget.com/oauth/token",
      {
        grant_type: "refresh_token",
        refresh_token: account.refresh_token,
        client_id: process.env.AUTH_YNAB_ID,
        client_secret: process.env.AUTH_YNAB_SECRET,
      },
    );

    console.log("✅ Successfully received response from YNAB OAuth endpoint");

    const { access_token, refresh_token } = response.data;

    if (!access_token) {
      console.error("❌ Token refresh failed: No access token in response");
      throw new Error("No access token received from YNAB");
    }

    console.log(
      `🔑 New access token received (length: ${access_token.length})`,
    );
    console.log(
      `🔑 New refresh token ${refresh_token ? `received (length: ${refresh_token.length})` : "not provided - keeping existing"}`,
    );

    console.log("💾 Updating database with new tokens");

    // Update the database with new tokens
    await prisma.account.update({
      where: { id: account.id },
      data: {
        access_token,
        refresh_token: refresh_token || account.refresh_token, // Keep old refresh token if new one not provided
      },
    });

    console.log("✅ Successfully updated database with new tokens");
    console.log("🎉 YNAB access token refresh completed successfully");

    return access_token;
  } catch (error) {
    console.error("❌ Error during YNAB access token refresh:", error);

    if (axios.isAxiosError(error)) {
      console.error("📡 HTTP Status:", error.response?.status);
      console.error("📡 Response Data:", error.response?.data);
      console.error("📡 Request URL:", error.config?.url);
    }

    throw new Error("Failed to refresh YNAB access token");
  }
}

let axiosInstance: ReturnType<typeof axios.create> | null = null;

export async function getYnabAxiosInstance() {
  if (!axiosInstance) {
    const accessToken = await getYnabAccessToken();

    axiosInstance = axios.create({
      baseURL: "https://api.youneedabudget.com/v1",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    addStackToAxios(axiosInstance);

    // Add response interceptor to handle token refresh
    axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          console.log(
            "🚨 Received 401 response from YNAB API, attempting token refresh",
          );
          console.log(`📍 Failed request URL: ${originalRequest.url}`);

          originalRequest._retry = true;

          try {
            console.log("🔄 Attempting to refresh YNAB access token...");
            const newAccessToken = await refreshYnabAccessToken();

            console.log(
              "✅ Token refresh successful, updating request headers",
            );

            // Update the authorization header
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            axiosInstance!.defaults.headers.Authorization = `Bearer ${newAccessToken}`;

            console.log("🔁 Retrying original request with new token");

            // Retry the original request
            return axiosInstance!(originalRequest);
          } catch (refreshError) {
            console.error(
              "❌ Token refresh failed in axios interceptor:",
              refreshError,
            );
            // Clear the cached instance so it gets recreated next time
            axiosInstance = null;
            console.log(
              "🧹 Cleared cached axios instance due to refresh failure",
            );
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      },
    );
  }

  return axiosInstance;
}
