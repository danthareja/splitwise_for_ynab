import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
  type AxiosError,
} from "axios";
import type { SyncState } from "./sync-state";
import { addStackToAxios } from "./utils";
import {
  YNABTransaction,
  YNABTransactionFlagColor,
  YNABErrorResponse,
} from "./ynab-types";

// Extend the request config type to include our retry flag
declare module "axios" {
  interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

interface YNABServiceConstructorParams {
  userId: string;
  budgetId: string;
  splitwiseAccountId: string;
  apiKey: string;
  manualFlagColor: string;
  syncedFlagColor: string;
  syncState: SyncState;
}

export class YNABService {
  private userId: string;
  private manualFlagColor: string;
  private syncedFlagColor: string;
  private splitwiseAccountId: string;
  private axios: AxiosInstance;
  private syncState: SyncState;

  constructor({
    userId,
    budgetId,
    splitwiseAccountId,
    apiKey,
    manualFlagColor,
    syncedFlagColor,
    syncState,
  }: YNABServiceConstructorParams) {
    this.userId = userId;
    this.manualFlagColor = manualFlagColor;
    this.syncedFlagColor = syncedFlagColor;
    this.splitwiseAccountId = splitwiseAccountId;
    this.syncState = syncState;

    this.axios = axios.create({
      baseURL: `https://api.youneedabudget.com/v1/budgets/${budgetId}`,
    });

    addStackToAxios(this.axios);

    this.axios.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        config.url = (config.url || "") + "?access_token=" + apiKey;
        return config;
      },
      (error: AxiosError) => {
        return Promise.reject(error);
      },
    );

    // Add response interceptor to handle token refresh
    this.axios.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<YNABErrorResponse>) => {
        const originalRequest = error.config;

        // Check if originalRequest exists and hasn't been retried yet
        if (
          originalRequest &&
          error.response?.status === 401 &&
          !originalRequest._retry
        ) {
          console.log(
            "🚨 YNABService: Received 401 response, attempting token refresh",
          );
          console.log(
            `📍 YNABService: Failed request URL: ${originalRequest.url}`,
          );
          console.log(`👤 YNABService: User ID: ${this.userId}`);

          originalRequest._retry = true;

          try {
            console.log(
              "🔄 YNABService: Attempting to refresh YNAB access token...",
            );

            // Import the refresh function from ynab-api
            const { refreshYnabAccessToken } = await import("./ynab-api");
            const newAccessToken = await refreshYnabAccessToken();

            console.log(
              "✅ YNABService: Token refresh successful, updating request URL",
            );

            // Update the URL with the new token
            if (originalRequest.url) {
              const url = new URL(
                originalRequest.url,
                this.axios.defaults.baseURL,
              );
              url.searchParams.set("access_token", newAccessToken);
              originalRequest.url = url.pathname + url.search;

              console.log(
                `🔗 YNABService: Updated request URL with new token: ${originalRequest.url}`,
              );
            }

            console.log(
              "🔁 YNABService: Retrying original request with new token",
            );

            // Retry the original request
            return this.axios(originalRequest);
          } catch (refreshError) {
            console.error(
              "❌ YNABService: Token refresh failed:",
              refreshError,
            );
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      },
    );
  }

  async getUnprocessedTransactions(serverKnowledge?: number) {
    if (serverKnowledge === undefined) {
      serverKnowledge = await this.getServerKnowledge();
    }

    const { data } = await this.getTransactions({
      last_knowledge_of_server: serverKnowledge,
    });

    return {
      transactions: (data.transactions as YNABTransaction[]).filter(
        (transaction) => this.isTransactionUnprocessed(transaction),
      ),
      serverKnowledge: data.server_knowledge as number,
    };
  }

  async markTransactionProcessed(transaction: YNABTransaction) {
    return this.updateTransaction(transaction.id, {
      ...transaction,
      flag_color: this.syncedFlagColor as YNABTransactionFlagColor,
    });
  }

  async createTransaction(data: Partial<YNABTransaction>) {
    const res = await this.axios.post(`/transactions`, {
      transaction: {
        account_id: this.splitwiseAccountId,
        ...data,
      },
    });

    return res.data;
  }

  async updateTransaction(id: string, data: Partial<YNABTransaction>) {
    const res = await this.axios.put(`/transactions/${id}`, {
      transaction: data,
    });

    return res.data;
  }

  async getTransactions(params?: {
    last_knowledge_of_server?: number | undefined;
  }) {
    const res = await this.axios.get(`/transactions`, {
      params,
    });

    return res.data;
  }

  async getServerKnowledge(): Promise<number | undefined> {
    return this.syncState.getYNABServerKnowledge(this.userId);
  }

  async setServerKnowledge(value: number) {
    return this.syncState.setYNABServerKnowledge(this.userId, value);
  }

  isTransactionUnprocessed(transaction: YNABTransaction) {
    return (
      transaction.flag_color === this.manualFlagColor &&
      transaction.account_id !== this.splitwiseAccountId &&
      !transaction.deleted
    );
  }

  toSplitwiseExpense(transaction: YNABTransaction) {
    return {
      cost: this.outflowToSplitwiseCost(transaction.amount),
      description: transaction.payee_name || "Unknown expense",
      details: transaction.memo || undefined,
      date: transaction.date,
    };
  }

  outflowToSplitwiseCost(amount: number) {
    return `${(amount * -1) / 1000}`;
  }
}
