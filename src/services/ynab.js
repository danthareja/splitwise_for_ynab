import axios from "axios";

import { KeyValueStore } from "./db";

export class YNABService {
  constructor({
    db,
    budgetId,
    splitwiseAccountId,
    apiKey = process.env.YNAB_API_KEY,
    ynabFlagColor = process.env.YNAB_FLAG_COLOR,
  }) {
    this.db = db;
    this.ynabFlagColor = ynabFlagColor;
    this.splitwiseAccountId = splitwiseAccountId;

    this.axios = axios.create({
      baseURL: `https://api.youneedabudget.com/v1/budgets/${budgetId}`,
      // headers: { Authorization: `Bearer ${apiKey}` },
    });

    // IDK why the 'headers' auth solution doesn't work
    //
    // I can use headers in Postman, but not in axios
    // I tried updating axios to 1.x, that didn't help
    // Splitwise's axios headers still work
    //
    // YNAB supports an alternate auth method where you append
    // the API key to the URL, so we're just using that for now

    this.axios.interceptors.request.use(
      (config) => {
        config.url = config.url + "?access_token=" + apiKey;
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
  }

  async getUnprocessedTransactions(serverKnowledge) {
    const { data } = await this.getTransactions({
      last_knowledge_of_server: serverKnowledge,
    });

    return {
      transactions: data.transactions.filter((transaction) =>
        this.isTransactionUnprocessed(transaction)
      ),
      serverKnowledge: data.server_knowledge,
    };
  }

  async markTransactionProcessed(transaction) {
    return this.updateTransaction(transaction.id, {
      ...transaction,
      flag_color: "green",
    });
  }

  async createTransaction(data) {
    const res = await this.axios.post(`/transactions`, {
      transaction: {
        account_id: this.splitwiseAccountId,
        ...data,
      },
    });

    return res.data;
  }

  async updateTransaction(id, data) {
    const res = await this.axios.put(`/transactions/${id}`, {
      transaction: data,
    });

    return res.data;
  }

  async getTransactions(params) {
    const res = await this.axios.get(`/transactions`, {
      params,
    });

    return res.data;
  }

  async getServerKnowledge() {
    return this.db.get();
  }

  async setServerKnowledge(value) {
    return this.db.set(value);
  }

  isTransactionUnprocessed(transaction) {
    return (
      transaction.flag_color === this.ynabFlagColor &&
      transaction.account_id !== this.splitwiseAccountId
    );
  }

  toSplitwiseExpense(transaction) {
    return {
      cost: this.outflowToSplitwiseCost(transaction.amount),
      description: transaction.payee_name,
      details: transaction.memo,
      date: transaction.date,
    };
  }

  outflowToSplitwiseCost(amount) {
    return `${(amount * -1) / 1000}`;
  }
}

export class MyYNABService extends YNABService {
  constructor() {
    super({
      db: new KeyValueStore("ynab:my_server_knowledge"),
      budgetId: process.env.YNAB_MY_BUDGET_ID,
      splitwiseAccountId: process.env.YNAB_MY_SPLITWISE_ACCOUNT_ID,
    });
  }
}
export class PartnerYNABService extends YNABService {
  constructor() {
    super({
      db: new KeyValueStore("ynab:partner_server_knowledge"),
      budgetId: process.env.YNAB_PARTNER_BUDGET_ID,
      splitwiseAccountId: process.env.YNAB_PARTNER_SPLITWISE_ACCOUNT_ID,
    });
  }
}
