import { type AxiosInstance } from "axios";
import * as Sentry from "@sentry/nextjs";
import type { SyncState } from "./sync-state";
import type { SplitwiseExpense, SplitwiseMember } from "@/types/splitwise";
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
  defaultSplitRatio?: string;
  useDescriptionAsPayee?: boolean;
  customPayeeName?: string;
}

export class SplitwiseService {
  private userId: string;
  private knownEmoji: string;
  private splitwiseUserId: number;
  private groupId: string;
  private currencyCode: string;
  private axios: AxiosInstance;
  private syncState: SyncState;
  private defaultSplitRatio: string;
  private useDescriptionAsPayee: boolean;
  private customPayeeName: string;

  constructor({
    userId,
    knownEmoji,
    splitwiseUserId,
    apiKey,
    syncState,
    groupId,
    currencyCode,
    defaultSplitRatio = "1:1",
    useDescriptionAsPayee = true,
    customPayeeName = "Splitwise for YNAB",
  }: SplitwiseServiceConstructorParams) {
    this.userId = userId;
    this.knownEmoji = knownEmoji;
    this.splitwiseUserId = splitwiseUserId;
    this.groupId = groupId;
    this.currencyCode = currencyCode;
    this.syncState = syncState;
    this.defaultSplitRatio = defaultSplitRatio;
    this.useDescriptionAsPayee = useDescriptionAsPayee;
    this.customPayeeName = customPayeeName;

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

  async createExpense(
    data: Partial<SplitwiseExpense>,
    customSplitRatio?: string,
  ) {
    const splitRatio = customSplitRatio || this.defaultSplitRatio;

    // Parse split ratio (e.g., "2:1" means user gets 2 shares, partner gets 1 share)
    const [userShares, partnerShares] = this.parseSplitRatio(splitRatio);
    const totalShares = userShares + partnerShares;

    // For equal splits, use the simpler API
    if (userShares === partnerShares) {
      const res = await this.axios.post("/create_expense", {
        currency_code: this.currencyCode,
        group_id: this.groupId,
        split_equally: true,
        ...data,
      });

      return res.data.expenses[0] as SplitwiseExpense;
    }

    // For custom splits, we need to get group members and specify shares
    const groupMembers = await this.getGroupMembers();
    const currentUser = groupMembers.find(
      (m: SplitwiseMember) => m.id === this.splitwiseUserId,
    );
    const partnerUser = groupMembers.find(
      (m: SplitwiseMember) => m.id !== this.splitwiseUserId,
    );

    if (!currentUser || !partnerUser) {
      throw new Error(
        "Unable to find both users in the Splitwise group for custom split",
      );
    }

    // Calculate owed shares based on ratio
    const cost = parseFloat(data.cost || "0");
    const userOwedShare = ((cost * userShares) / totalShares).toFixed(2);
    const partnerOwedShare = ((cost * partnerShares) / totalShares).toFixed(2);

    // Build custom split payload
    const expensePayload = {
      currency_code: this.currencyCode,
      group_id: this.groupId,
      split_equally: false,
      [`users__0__user_id`]: currentUser.id,
      [`users__0__paid_share`]: data.cost || "0", // User paid the full amount
      [`users__0__owed_share`]: userOwedShare,
      [`users__1__user_id`]: partnerUser.id,
      [`users__1__paid_share`]: "0", // Partner paid nothing
      [`users__1__owed_share`]: partnerOwedShare,
      ...data,
    };

    const res = await this.axios.post("/create_expense", expensePayload);
    return res.data.expenses[0] as SplitwiseExpense;
  }

  private parseSplitRatio(ratio: string): [number, number] {
    const parts = ratio.split(":").map((part) => parseInt(part.trim(), 10));
    if (parts.length !== 2 || parts.some(isNaN)) {
      throw new Error(
        `Invalid split ratio format: ${ratio}. Expected format: "2:1"`,
      );
    }
    return [parts[0]!, parts[1]!];
  }

  private async getGroupMembers(): Promise<SplitwiseMember[]> {
    const res = await this.axios.get(`/get_group/${this.groupId}`);
    return res.data.group.members as SplitwiseMember[];
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
    if (!this.useDescriptionAsPayee) {
      return this.toYNABTransactionWithCustomPayee(expense);
    }

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
      payee_name: this.customPayeeName,
      memo,
      date: this.stripTimestamp(expense.date),
    };
  }

  toYNABTransactionWithCustomPayee(expense: SplitwiseExpense) {
    console.log(
      ">>>>>>>>>>>>>>>>>>>>>>>> toYNABTransactionWithCustomPayee",
      this.customPayeeName,
    );
    let memo = this.stripEmojis(expense.description);

    if (expense.details) {
      memo += `: ${expense.details}`;
    }

    return {
      amount: this.toYNABAmount(expense),
      payee_name: this.customPayeeName,
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
