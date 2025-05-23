import axios, { type AxiosInstance } from "axios"
import axiosRetry, { isNetworkOrIdempotentRequestError } from "axios-retry"

import { KeyValueStore } from "./db"
import { addStackToAxios } from "./utils"

export const FIRST_KNOWN_DATE = "2023-11-20T08:49:26.012Z"

interface SplitwiseServiceConstructorParams {
  db: KeyValueStore
  knownEmoji: string
  userId: number
  apiKey: string
  groupId?: string
  currencyCode?: string
}

interface Expense {
  id: number
  description: string
  deleted_at?: string | null
  details?: string
  date: string // Consider using Date type if appropriate
  repayments: { to: number; amount: string }[]
  created_by: { first_name: string }
  // Add other expense properties here
}

export class SplitwiseService {
  private db: KeyValueStore
  private knownEmoji: string
  private userId: number
  private groupId: string
  private currencyCode: string
  private axios: AxiosInstance

  constructor({
    db,
    knownEmoji,
    userId,
    apiKey,
    groupId = process.env.SPLITWISE_GROUP_ID!,
    currencyCode = process.env.SPLITWISE_CURRENCY_CODE!,
  }: SplitwiseServiceConstructorParams) {
    this.db = db
    this.knownEmoji = knownEmoji
    this.userId = userId
    this.groupId = groupId
    this.currencyCode = currencyCode

    this.axios = axios.create({
      baseURL: "https://secure.splitwise.com/api/v3.0",
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    addStackToAxios(this.axios)

    axiosRetry(this.axios, {
      retries: 3,
      shouldResetTimeout: true,
      retryCondition: (e) => e?.code === "ECONNABORTED" || isNetworkOrIdempotentRequestError(e),
    })
  }

  static async validateApiKey(apiKey: string) {
    try {
      const axiosInstance = axios.create({
        baseURL: "https://secure.splitwise.com/api/v3.0",
        headers: { Authorization: `Bearer ${apiKey}` },
      })

      addStackToAxios(axiosInstance)

      const response = await axiosInstance.get("/get_current_user")
      return {
        success: true,
        user: response.data.user,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to validate API key",
      }
    }
  }

  async createExpense(data: Partial<Expense>) {
    const res = await this.axios.post("/create_expense", {
      currency_code: this.currencyCode,
      group_id: this.groupId,
      split_equally: true, // WARNING: ASSUMPTION
      ...data,
    })

    return res.data.expenses[0] as Expense
  }

  async getUnprocessedExpenses({ updated_after = FIRST_KNOWN_DATE } = {}) {
    const res = await this.axios.get("/get_expenses", {
      params: {
        group_id: this.groupId,
        updated_after,
        limit: 50,
      },
    })

    return res.data.expenses.filter((expense: Expense) => this.isExpenseUnprocessed(expense))
  }

  async markExpenseProcessed(expense: Expense) {
    await this.axios.post(`/update_expense/${expense.id}`, {
      description: `${this.knownEmoji}${expense.description}`,
    })
  }

  isExpenseUnprocessed(expense: Expense) {
    const isDeleted = !!expense.deleted_at
    if (isDeleted) {
      return false
    }

    const hasKnownEmoji = expense.description.includes(this.knownEmoji)
    return !hasKnownEmoji
  }

  async getLastProcessedDate() {
    const dbDate = await this.db.get()

    const isStaleDbDate = new Date(dbDate) < new Date(FIRST_KNOWN_DATE)
    if (isStaleDbDate) {
      return FIRST_KNOWN_DATE
    }

    return dbDate
  }

  async setLastProcessedDate(value = new Date().toISOString()) {
    return this.db.set(value)
  }

  toYNABTransaction(expense: Expense) {
    return this.hasKnownPayee(expense)
      ? this.toYNABTransactionWithKnownPayee(expense)
      : this.toYNABTranstionWithUnknownPayee(expense)
  }

  hasKnownPayee(expense: Expense) {
    return true
  }

  toYNABTransactionWithKnownPayee(expense: Expense) {
    return {
      amount: this.toYNABAmount(expense),
      payee_name: this.stripEmojis(expense.description),
      memo: expense.details,
      date: expense.date,
    }
  }

  toYNABTranstionWithUnknownPayee(expense: Expense) {
    return {
      amount: this.toYNABAmount(expense),
      payee_name: `Splitwise from ${expense.created_by.first_name}`,
      memo: this.stripEmojis(expense.description),
      date: expense.date,
    }
  }

  toYNABAmount(expense: Expense) {
    const repayment = expense.repayments[0]
    const isInflow = repayment.to == this.userId

    return isInflow ? this.costToYNABInflow(repayment.amount) : this.costToYNABOutflow(repayment.amount)
  }

  costToYNABInflow(amount: string) {
    // https://stackoverflow.com/questions/21472828/javascript-multiplying-by-100-giving-weird-result
    return Number.parseInt((Number.parseFloat(amount) * 1000).toFixed(0))
  }

  costToYNABOutflow(amount: string) {
    return this.costToYNABInflow(amount) * -1
  }

  stripEmojis(string: string) {
    return string.replace(/\p{Extended_Pictographic}/gu, "")
  }
}

export class MySplitwiseService extends SplitwiseService {
  constructor() {
    super({
      db: new KeyValueStore("splitwise:my_last_processed"),
      knownEmoji: "🤴",
      userId: Number.parseInt(process.env.SPLITWISE_MY_USER_ID!),
      apiKey: process.env.SPLITWISE_MY_API_KEY!,
    })
  }
}

export class PartnerSplitwiseService extends SplitwiseService {
  constructor() {
    super({
      db: new KeyValueStore("splitwise:partner_last_processed"),
      knownEmoji: "👸",
      userId: Number.parseInt(process.env.SPLITWISE_PARTNER_USER_ID!),
      apiKey: process.env.SPLITWISE_PARTNER_API_KEY!,
    })
  }
}
