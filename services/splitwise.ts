import { type AxiosInstance } from "axios";
import * as Sentry from "@sentry/nextjs";
import type { SyncState } from "./sync-state";
import { SplitwiseExpense } from "../types/splitwise";
import { createSplitwiseAxios } from "./splitwise-axios";

export const FIRST_KNOWN_DATE = "2025-05-23T08:49:26.012Z";

interface SplitwiseServiceConstructorParams {
  userId: string;
  knownEmoji: string;
  splitwiseUserId: number;
  apiKey: string;
  groupId: string;
  currencyCode: string;
  syncState: SyncState;
  backupPayeeName?: string;
}

export class SplitwiseService {
  private userId: string;
  private knownEmoji: string;
  private splitwiseUserId: number;
  private groupId: string;
  private currencyCode: string;
  private axios: AxiosInstance;
  private syncState: SyncState;
  private backupPayeeName: string;

  constructor({
    userId,
    knownEmoji,
    splitwiseUserId,
    apiKey,
    syncState,
    groupId,
    currencyCode,
    backupPayeeName,
  }: SplitwiseServiceConstructorParams) {
    this.userId = userId;
    this.knownEmoji = knownEmoji;
    this.splitwiseUserId = splitwiseUserId;
    this.groupId = groupId;
    this.currencyCode = currencyCode;
    this.syncState = syncState;
    this.backupPayeeName = backupPayeeName || "Splitwise for YNAB";

    this.axios = createSplitwiseAxios({ accessToken: apiKey });
  }

  static async validateApiKey(apiKey: string) {
    try {
      const axiosInstance = createSplitwiseAxios({ accessToken: apiKey });

      const response = await axiosInstance.get("/get_current_user");
      return {
        success: true,
        user: response.data.user,
      };
    } catch (error) {
      Sentry.captureException(error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to validate API key",
      };
    }
  }

  async createExpense(data: Partial<SplitwiseExpense>) {
    const res = await this.axios.post("/create_expense", {
      currency_code: this.currencyCode,
      group_id: this.groupId,
      split_equally: true, // WARNING: ASSUMPTION
      ...data,
    });

    return res.data.expenses[0] as SplitwiseExpense;
  }

  async getUnprocessedExpenses({ updated_after = FIRST_KNOWN_DATE } = {}) {
    const res = await this.axios.get("/get_expenses", {
      params: {
        group_id: this.groupId,
        updated_after,
        limit: 50,
      },
    });

    return (res.data.expenses as SplitwiseExpense[]).filter((expense) =>
      this.isExpenseUnprocessed(expense),
    );
  }

  async markExpenseProcessed(expense: SplitwiseExpense) {
    await this.axios.post(`/update_expense/${expense.id}`, {
      description: `${this.knownEmoji}${expense.description}`,
    });
  }

  isExpenseUnprocessed(expense: SplitwiseExpense) {
    const isDeleted = !!expense.deleted_at;
    if (isDeleted) {
      return false;
    }

    const hasKnownEmoji = expense.description.includes(this.knownEmoji);
    return !hasKnownEmoji;
  }

  async getLastProcessedDate() {
    const dbDate = await this.syncState.getSplitwiseLastProcessed(this.userId);

    const isStaleDbDate = dbDate
      ? new Date(dbDate) < new Date(FIRST_KNOWN_DATE)
      : true;
    if (isStaleDbDate) {
      return FIRST_KNOWN_DATE;
    }

    return dbDate;
  }

  async setLastProcessedDate(value = new Date().toISOString()) {
    return this.syncState.setSplitwiseLastProcessed(this.userId, value);
  }

  toYNABTransaction(expense: SplitwiseExpense) {
    return this.hasInvalidPayee(expense)
      ? this.toYNABTransactionWithInvalidPayee(expense)
      : this.toYNABTransactionWithValidPayee(expense);
  }

  hasInvalidPayee(expense: SplitwiseExpense) {
    // Starting with an internal payee name will throw a 400 error
    // when creating a transaction in YNAB
    const internalPayeeNames = [
      "Transfer : ",
      "Starting Balance",
      "Manual Balance Adjustment",
      "Reconciliation Balance Adjustment",
    ];

    return internalPayeeNames.some((payeeName) =>
      expense.description.startsWith(payeeName),
    );
  }

  toYNABTransactionWithValidPayee(expense: SplitwiseExpense) {
    return {
      amount: this.toYNABAmount(expense),
      payee_name: this.stripEmojis(expense.description),
      memo: expense.details,
      date: this.stripTimestamp(expense.date),
    };
  }

  toYNABTransactionWithInvalidPayee(expense: SplitwiseExpense) {
    let memo = this.stripEmojis(expense.description);

    if (expense.details) {
      memo += `: ${expense.details}`;
    }

    return {
      amount: this.toYNABAmount(expense),
      payee_name: this.backupPayeeName,
      memo,
      date: this.stripTimestamp(expense.date),
    };
  }

  toYNABAmount(expense: SplitwiseExpense) {
    const repayment = expense.repayments[0];
    if (!repayment) {
      // Handle case where there are no repayments - perhaps a zero-cost expense
      return 0;
    }

    const isInflow = repayment.to == this.splitwiseUserId;

    return isInflow
      ? this.costToYNABInflow(repayment.amount)
      : this.costToYNABOutflow(repayment.amount);
  }

  costToYNABInflow(amount: string) {
    // https://stackoverflow.com/questions/21472828/javascript-multiplying-by-100-giving-weird-result
    return Number.parseInt((Number.parseFloat(amount) * 1000).toFixed(0));
  }

  costToYNABOutflow(amount: string) {
    return this.costToYNABInflow(amount) * -1;
  }

  stripEmojis(string: string) {
    return string.replace(/\p{Extended_Pictographic}/gu, "");
  }

  stripTimestamp(string: string) {
    return string.split("T")[0];
  }
}
