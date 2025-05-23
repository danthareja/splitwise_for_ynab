import axios, { type AxiosInstance } from "axios"
import axiosRetry, { isNetworkOrIdempotentRequestError } from "axios-retry"
import { type SyncState, SyncStateFactory } from "./sync-state"
import { addStackToAxios } from "./utils"

export const FIRST_KNOWN_DATE = "2025-05-23T08:49:26.012Z"

interface User {
  id: number
  first_name: string
  last_name: string
  email: string
  registration_status: string
  picture: object
  custom_picture: boolean
}

interface Category {
  id: number
  name: string
}

interface Receipt {
  large: string
  original: string
}

interface ExpenseUser {
  user: object
  user_id: number
  paid_share: string
  owed_share: string
  net_balance: string
}

interface Comment {
  id: number
  content: string
  comment_type: string
  relation_type: string
  relation_id: number
  created_at: string
  deleted_at: string
  user: object
}

interface Repayment {
  from: number
  to: number
  amount: string
}

interface Expense {
  cost: string
  description: string
  details?: string
  date: string
  repeat_interval: string
  currency_code: string
  category_id: number
  id: number
  group_id: number
  friendship_id: number
  expense_bundle_id: number
  repeats: boolean
  email_reminder: boolean
  email_reminder_in_advance: string | null
  next_repeat: string
  comments_count: number
  payment: boolean
  transaction_confirmed: boolean
  repayments: Repayment[]
  created_at: string
  created_by: User
  updated_at: string
  updated_by: User
  deleted_at?: string | null
  deleted_by?: User
  category: Category
  receipt: Receipt
  users: ExpenseUser[]
  comments: Comment[]
}

interface SplitwiseServiceConstructorParams {
  userId: string
  knownEmoji: string
  splitwiseUserId: number
  apiKey: string
  groupId: string
  currencyCode: string
  syncState?: SyncState
}

export class SplitwiseService {
  private userId: string
  private knownEmoji: string
  private splitwiseUserId: number
  private groupId: string
  private currencyCode: string
  private axios: AxiosInstance
  private syncState: SyncState

  constructor({
    userId,
    knownEmoji,
    splitwiseUserId,
    apiKey,
    syncState,
    groupId,
    currencyCode,
  }: SplitwiseServiceConstructorParams) {
    this.userId = userId
    this.knownEmoji = knownEmoji
    this.splitwiseUserId = splitwiseUserId
    this.groupId = groupId
    this.currencyCode = currencyCode
    this.syncState = syncState || SyncStateFactory.create()

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

    return (res.data.expenses as Expense[]).filter((expense) => this.isExpenseUnprocessed(expense))
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
    const dbDate = await this.syncState.getSplitwiseLastProcessed(this.userId)

    const isStaleDbDate = dbDate ? new Date(dbDate) < new Date(FIRST_KNOWN_DATE) : true
    if (isStaleDbDate) {
      return FIRST_KNOWN_DATE
    }

    return dbDate
  }

  async setLastProcessedDate(value = new Date().toISOString()) {
    return this.syncState.setSplitwiseLastProcessed(this.userId, value)
  }

  toYNABTransaction(expense: Expense) {
    return this.hasKnownPayee()
      ? this.toYNABTransactionWithKnownPayee(expense)
      : this.toYNABTranstionWithUnknownPayee(expense)
  }

  hasKnownPayee() {
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
    const isInflow = repayment.to == this.splitwiseUserId

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
  constructor(userId: string) {
    super({
      userId,
      knownEmoji: "🤴",
      splitwiseUserId: Number.parseInt(process.env.SPLITWISE_MY_USER_ID!),
      apiKey: process.env.SPLITWISE_MY_API_KEY!,
      groupId: process.env.SPLITWISE_GROUP_ID!,
      currencyCode: process.env.SPLITWISE_CURRENCY_CODE!,
    })
  }
}

export class PartnerSplitwiseService extends SplitwiseService {
  constructor(userId: string) {
    super({
      userId,
      knownEmoji: "👸",
      splitwiseUserId: Number.parseInt(process.env.SPLITWISE_PARTNER_USER_ID!),
      apiKey: process.env.SPLITWISE_PARTNER_API_KEY!,
      groupId: process.env.SPLITWISE_GROUP_ID!,
      currencyCode: process.env.SPLITWISE_CURRENCY_CODE!,
    })
  }
}
