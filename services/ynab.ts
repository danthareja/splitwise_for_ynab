import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from "axios";

import { KeyValueStore } from "./db";
import { addStackToAxios } from "./utils";

interface YNABServiceConstructorParams {
  db: KeyValueStore;
  budgetId: string;
  splitwiseAccountId: string;
  apiKey?: string;
  ynabFlagColor?: string;
}

type TransactionClearedStatus = 'cleared' | 'uncleared' | 'reconciled';
type TransactionFlagColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple';

interface SubTransaction {
  id: string;
  transaction_id: string;
  amount: number; // in milliunits format
  memo?: string | null;
  payee_id?: string | null;
  payee_name?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  transfer_account_id?: string | null;
  transfer_transaction_id?: string | null;
  deleted: boolean;
}

interface YNABTransaction {
  id: string;
  date: string; // ISO format (e.g. 2016-12-01)
  amount: number; // in milliunits format
  memo?: string | null;
  cleared: TransactionClearedStatus;
  approved: boolean;
  flag_color?: TransactionFlagColor | null;
  flag_name?: string | null;
  account_id: string;
  payee_id?: string | null;
  category_id?: string | null;
  transfer_account_id?: string | null;
  transfer_transaction_id?: string | null;
  matched_transaction_id?: string | null;
  import_id?: string | null;
  import_payee_name?: string | null;
  import_payee_name_original?: string | null;
  debt_transaction_type?: string | null;
  deleted: boolean;
  account_name: string;
  payee_name?: string | null;
  category_name?: string | null;
  subtransactions: SubTransaction[];
}

interface YNABErrorDetail {
  id: string;
  name: string;
  detail: string;
}

interface YNABErrorResponse {
  error: YNABErrorDetail;
}

export class YNABService {
  private db: KeyValueStore;
  private ynabFlagColor: string;
  private splitwiseAccountId: string;
  private axios: AxiosInstance;

  constructor({
    db,
    budgetId,
    splitwiseAccountId,
    apiKey = process.env.YNAB_API_KEY!,
    ynabFlagColor = process.env.YNAB_FLAG_COLOR!,
  }: YNABServiceConstructorParams) {
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

    addStackToAxios(this.axios, (e: AxiosError<YNABErrorResponse>) => {
      if (e.response && e.response.data && e.response.data.error) {
        const errorData = e.response.data.error;
        e.message = `YNAB Request failed with ${errorData.name} (${errorData.id}): ${errorData.detail} `;
      } else {
        // Default message if the expected error structure is not present
        e.message = `YNAB Request failed: ${e.message}`;
      }
      delete e.request;
      delete e.response;
      return e;
    });

    this.axios.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        config.url = (config.url || "") + "?access_token=" + apiKey;
        return config;
      },
      (error: AxiosError) => {
        return Promise.reject(error);
      }
    );
  }

  async getUnprocessedTransactions(serverKnowledge: number | undefined) {
    const { data } = await this.getTransactions({
      last_knowledge_of_server: serverKnowledge,
    });

    return {
      transactions: (data.transactions as YNABTransaction[]).filter((transaction) =>
        this.isTransactionUnprocessed(transaction)
      ),
      serverKnowledge: data.server_knowledge as number,
    };
  }

  async markTransactionProcessed(transaction: YNABTransaction) {
    return this.updateTransaction(transaction.id, {
      ...transaction,
      flag_color: "green",
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

  async getTransactions(params?: { last_knowledge_of_server?: number | undefined }) {
    const res = await this.axios.get(`/transactions`, {
      params,
    });

    return res.data;
  }

  async getServerKnowledge(): Promise<number | undefined> {
    const value = await this.db.get();
    return value ? Number(value) : undefined;
  }

  async setServerKnowledge(value: number) {
    return this.db.set(value.toString());
  }

  isTransactionUnprocessed(transaction: YNABTransaction) {
    return (
      transaction.flag_color === this.ynabFlagColor &&
      transaction.account_id !== this.splitwiseAccountId &&
      !transaction.deleted
    );
  }

  toSplitwiseExpense(transaction: YNABTransaction) {
    return {
      cost: this.outflowToSplitwiseCost(transaction.amount),
      description: transaction.payee_name,
      details: transaction.memo,
      date: transaction.date,
    };
  }

  outflowToSplitwiseCost(amount: number) {
    return `${(amount * -1) / 1000}`;
  }
}

export class MyYNABService extends YNABService {
  constructor() {
    super({
      db: new KeyValueStore("ynab:my_server_knowledge"),
      budgetId: process.env.YNAB_MY_BUDGET_ID!,
      splitwiseAccountId: process.env.YNAB_MY_SPLITWISE_ACCOUNT_ID!,
    });
  }
}
export class PartnerYNABService extends YNABService {
  constructor() {
    super({
      db: new KeyValueStore("ynab:partner_server_knowledge"),
      budgetId: process.env.YNAB_PARTNER_BUDGET_ID!,
      splitwiseAccountId: process.env.YNAB_PARTNER_SPLITWISE_ACCOUNT_ID!,
    });
  }
}
