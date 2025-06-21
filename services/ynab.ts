import type { AxiosInstance } from "axios";
import type { YNABTransaction, YNABTransactionFlagColor } from "@/types/ynab";
import type { SyncState } from "./sync-state";
import { createYNABAxios } from "./ynab-axios";

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

    // Create axios instance with token refresh interceptor already configured
    this.axios = createYNABAxios({
      accessToken: apiKey,
      path: `/budgets/${budgetId}`,
    });
  }

  async getUnprocessedTransactions(serverKnowledge?: number): Promise<{
    transactions: YNABTransaction[];
    serverKnowledge: number;
  }> {
    if (serverKnowledge === undefined) {
      serverKnowledge = await this.getServerKnowledge();
    }

    const { data } = await this.getTransactions({
      last_knowledge_of_server: serverKnowledge,
    });

    return {
      transactions: data.transactions.filter((transaction) =>
        this.isTransactionUnprocessed(transaction),
      ),
      serverKnowledge: data.server_knowledge,
    };
  }

  async markTransactionProcessed(transaction: YNABTransaction) {
    return this.updateTransaction(transaction.id, {
      flag_color: this.syncedFlagColor as YNABTransactionFlagColor,
    });
  }

  async createTransaction(data: Partial<YNABTransaction>) {
    const res = await this.axios.post(
      `/transactions`,
      {
        transaction: {
          account_id: this.splitwiseAccountId,
          ...data,
        },
      },
      {
        _operation: "create transaction",
      },
    );

    return res.data;
  }

  async updateTransaction(id: string, data: Partial<YNABTransaction>) {
    const res = await this.axios.put(
      `/transactions/${id}`,
      {
        transaction: data,
      },
      {
        _operation: "update transaction",
      },
    );

    return res.data;
  }

  async getTransactions(params?: {
    last_knowledge_of_server?: number | undefined;
  }): Promise<{
    data: {
      transactions: YNABTransaction[];
      server_knowledge: number;
    };
  }> {
    const res = await this.axios.get(`/transactions`, {
      params,
      _operation: "get transactions",
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
      date: transaction.date.split("T")[0],
    };
  }

  outflowToSplitwiseCost(amount: number) {
    return `${(amount * -1) / 1000}`;
  }
}
