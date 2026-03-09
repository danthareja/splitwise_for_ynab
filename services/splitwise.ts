import { type AxiosInstance } from "axios";
import { createHash } from "crypto";
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

    this.axios = createSplitwiseAxios({
      accessToken: apiKey,
    });
  }

  static async validateApiKey(apiKey: string) {
    try {
      const axiosInstance = createSplitwiseAxios({ accessToken: apiKey });

      const response = await axiosInstance.get("/get_current_user", {
        _operation: "validate API key",
      });
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
    data: Partial<SplitwiseExpense> & { isInflow?: boolean },
    customSplitRatio?: string,
  ) {
    const splitRatio = customSplitRatio || this.defaultSplitRatio;
    const isInflow = !!data.isInflow;

    // Strip isInflow before sending to the API
    const { isInflow: _, ...apiData } = data;

    // Parse split ratio (e.g., "2:1" means user gets 2 shares, partner gets 1 share)
    const [userShares, partnerShares] = this.parseSplitRatio(splitRatio);
    const totalShares = userShares + partnerShares;

    // For equal outflow splits, use the simpler API
    // Inflows must always use the custom split path because
    // split_equally always assumes the authenticated user paid
    if (userShares === partnerShares && !isInflow) {
      const res = await this.axios.post(
        "/create_expense",
        {
          currency_code: this.currencyCode,
          group_id: this.groupId,
          split_equally: true,
          ...apiData,
        },
        {
          _operation: `create expense (equal split) for amount ${apiData.cost}`,
        },
      );

      return res.data.expenses[0] as SplitwiseExpense;
    }

    // For custom splits (or any inflow), we need to get group members and specify shares
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

    // For inflows, invert the ratio so the offset is proportional
    const effectiveUserShares = isInflow ? partnerShares : userShares;
    const effectivePartnerShares = isInflow ? userShares : partnerShares;

    // Calculate owed shares based on ratio
    const cost = parseFloat(apiData.cost || "0");
    const userOwedShare = ((cost * effectiveUserShares) / totalShares).toFixed(
      2,
    );
    const partnerOwedShare = (
      (cost * effectivePartnerShares) /
      totalShares
    ).toFixed(2);

    // Build custom split payload
    // For inflows, flip who paid: partner paid the full amount instead of user
    const expensePayload = {
      currency_code: this.currencyCode,
      group_id: this.groupId,
      split_equally: false,
      [`users__0__user_id`]: currentUser.id,
      [`users__0__paid_share`]: isInflow ? "0" : apiData.cost || "0",
      [`users__0__owed_share`]: userOwedShare,
      [`users__1__user_id`]: partnerUser.id,
      [`users__1__paid_share`]: isInflow ? apiData.cost || "0" : "0",
      [`users__1__owed_share`]: partnerOwedShare,
      ...apiData,
    };

    const res = await this.axios.post("/create_expense", expensePayload, {
      _operation: `create expense (${isInflow ? "inflow" : "custom split"}) for amount ${apiData.cost}`,
    });

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
    const res = await this.axios.get(`/get_group/${this.groupId}`, {
      _operation: "get group members",
    });
    return res.data.group.members as SplitwiseMember[];
  }

  async getUnprocessedExpenses({ updated_after = FIRST_KNOWN_DATE } = {}) {
    const res = await this.axios.get("/get_expenses", {
      params: {
        group_id: this.groupId,
        updated_after,
        limit: 50,
      },
      _operation: "get unprocessed expenses",
    });

    return (res.data.expenses as SplitwiseExpense[]).filter((expense) =>
      this.isExpenseUnprocessed(expense, updated_after),
    );
  }

  async markExpenseProcessed(expense: SplitwiseExpense) {
    // Strip any existing known emojis to prevent stacking (e.g. ✅✅✅ → ✅)
    const cleanDescription = expense.description.replace(
      new RegExp(`^(${this.escapeRegex(this.knownEmoji)})+`, "u"),
      "",
    );
    await this.axios.post(
      `/update_expense/${expense.id}`,
      {
        description: `${this.knownEmoji}${cleanDescription}`,
      },
      {
        _operation: "mark expense as processed",
      },
    );
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /**
   * Determines if an expense should be processed.
   *
   * An expense is considered unprocessed if:
   * 1. It's not deleted
   * 2. AND either:
   *    - It doesn't have the known emoji in its description, OR
   *    - It was CREATED after the last sync date (handles recurring expenses
   *      that inherit the emoji from their parent but are actually new instances)
   */
  isExpenseUnprocessed(expense: SplitwiseExpense, lastSyncDate?: string) {
    const isDeleted = !!expense.deleted_at;
    if (isDeleted) {
      return false;
    }

    const hasKnownEmoji = expense.description.includes(this.knownEmoji);

    // If it doesn't have the emoji, it's definitely unprocessed
    if (!hasKnownEmoji) {
      return true;
    }

    // If it has the emoji but was CREATED after the last sync date,
    // it's a new recurring expense instance that inherited the emoji
    // from its parent expense and should still be processed
    if (lastSyncDate && expense.created_at) {
      const expenseCreatedAt = new Date(expense.created_at);
      const syncDate = new Date(lastSyncDate);
      if (expenseCreatedAt > syncDate) {
        return true;
      }
    }

    return false;
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
      import_id: this.generateImportId(expense),
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
      import_id: this.generateImportId(expense),
    };
  }

  toYNABTransactionWithCustomPayee(expense: SplitwiseExpense) {
    let memo = this.stripEmojis(expense.description);

    if (expense.details) {
      memo += `: ${expense.details}`;
    }

    return {
      amount: this.toYNABAmount(expense),
      payee_name: this.customPayeeName,
      memo,
      date: this.stripTimestamp(expense.date),
      import_id: this.generateImportId(expense),
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

  private generateImportId(expense: SplitwiseExpense): string {
    const hash = createHash("md5")
      .update(expense.description + this.toYNABAmount(expense))
      .digest("hex")
      .slice(0, 8);
    return `sw:${expense.id}:${hash}`;
  }
}
