import axios from "axios";
import axiosRetry, { isNetworkOrIdempotentRequestError } from "axios-retry";
import pFilter from "p-filter";

import { KeyValueStore } from "./db";

const FIRST_KNOWN_DATE = "2022-12-09T01:33:50.492Z";

export class SplitwiseService {
  constructor({
    db,
    knownComment,
    userId,
    apiKey,
    groupId = process.env.SPLITWISE_GROUP_ID,
    currencyCode = process.env.SPLITWISE_CURRENCY_CODE,
  }) {
    this.db = db;
    this.knownComment = knownComment;
    this.userId = userId;
    this.groupId = groupId;
    this.currencyCode = currencyCode;

    this.axios = axios.create({
      baseURL: "https://secure.splitwise.com/api/v3.0",
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 500,
    });

    axiosRetry(this.axios, {
      retries: 3,
      shouldResetTimeout: true,
      retryCondition: (e) =>
        e?.code === "ECONNABORTED" || isNetworkOrIdempotentRequestError(e),
    });
  }

  async createExpense(data) {
    const res = await this.axios.post("/create_expense", {
      currency_code: this.currencyCode,
      group_id: this.groupId,
      split_equally: true, // WARNING: ASSUMPTION
      ...data,
    });

    return res.data.expenses[0];
  }

  async getUnprocessedExpenses() {
    const res = await this.axios.get("/get_expenses", {
      params: {
        group_id: this.groupId,
        updated_after: FIRST_KNOWN_DATE,
        limit: 10,
      },
    });

    return pFilter(
      res.data.expenses,
      (expense) => this.isExpenseUnprocessed(expense),
      { concurrency: 10 }
    );
  }

  async markExpenseProcessed(expense) {
    const res = await this.axios.post("/create_comment", {
      expense_id: expense.id,
      content: this.knownComment,
    });

    return res.data.comment;
  }

  async isExpenseUnprocessed(expense) {
    const isDeleted = !!expense.deleted_at;

    if (isDeleted) {
      return false;
    }
    const comments = await this.getComments(expense);
    const hasKnownComment = comments.find(
      (comment) => comment.content === this.knownComment
    );

    return !hasKnownComment;
  }

  async getComments(expense) {
    const res = await this.axios.get("/get_comments", {
      params: {
        expense_id: expense.id,
      },
    });

    return res.data.comments;
  }

  async getLastProcessedDate() {
    return this.db.get();
  }

  async setLastProcessedDate(value = new Date().toISOString()) {
    return this.db.set(value);
  }

  toYNABTransaction(expense) {
    return this.hasKnownPayee(expense)
      ? this.toYNABTransactionWithKnownPayee(expense)
      : this.toYNABTranstionWithUnknownPayee(expense);
  }

  hasKnownPayee() {
    return true;
  }

  toYNABTransactionWithKnownPayee(expense) {
    return {
      amount: this.toYNABAmount(expense),
      payee_name: expense.description,
      memo: expense.details,
      date: expense.date,
    };
  }

  toYNABTranstionWithUnknownPayee(expense) {
    return {
      amount: this.toYNABAmount(expense),
      payee_name: `Splitwise from ${expense.created_by.first_name}`,
      memo: expense.description,
      date: expense.date,
    };
  }

  toYNABAmount(expense) {
    const repayment = expense.repayments[0];
    const isInflow = repayment.to == this.userId;

    return isInflow
      ? this.costToYNABInflow(repayment.amount)
      : this.costToYNABOutflow(repayment.amount);
  }

  costToYNABInflow(amount) {
    return parseFloat(amount) * 1000;
  }

  costToYNABOutflow(amount) {
    return this.costToYNABInflow(amount) * -1;
  }
}

export class MySplitwiseService extends SplitwiseService {
  constructor() {
    super({
      db: new KeyValueStore("splitwise:my_last_processed"),
      knownComment: "Processed by DanBOT 9005",
      userId: parseInt(process.env.SPLITWISE_MY_USER_ID),
      apiKey: process.env.SPLITWISE_MY_API_KEY,
    });
  }
}

export class PartnerSplitwiseService extends SplitwiseService {
  constructor() {
    super({
      db: new KeyValueStore("splitwise:partner_last_processed"),
      knownComment: "Processed by EiraBOT 9005",
      userId: parseInt(process.env.SPLITWISE_PARTNER_USER_ID),
      apiKey: process.env.SPLITWISE_PARTNER_API_KEY,
    });
  }
}
