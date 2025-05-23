import { prisma } from "@/db"
import { YNABService } from "./ynab"
import { SplitwiseService } from "./splitwise"
import { processLatestExpenses, processLatestTransactions } from "./glue"
import type { SyncedItem } from "@prisma/client"

interface SyncResult {
  success: boolean
  syncHistoryId?: string
  error?: string
  syncedTransactions?: SyncedItem[]
  syncedExpenses?: SyncedItem[]
}

export async function syncUserData(userId: string): Promise<SyncResult> {
  // Create a sync history record
  const syncHistory = await prisma.syncHistory.create({
    data: {
      userId,
      status: "pending",
    },
  })

  try {
    // Check if user has both YNAB and Splitwise configured
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ynabSettings: true,
        splitwiseSettings: true,
        accounts: true,
      },
    })

    if (!user) {
      throw new Error("User not found")
    }

    if (!user.ynabSettings || !user.splitwiseSettings) {
      throw new Error("User has not configured both YNAB and Splitwise")
    }

    if (!user.ynabSettings.splitwiseAccountId) {
      throw new Error("Splitwise account not configured in YNAB settings")
    }

    if (!user.splitwiseSettings.splitwiseGroupId || !user.splitwiseSettings.splitwiseCurrencyCode) {
      throw new Error("Splitwise group or currency not configured")
    }

    const ynabAccount = user.accounts.find((account) => account.provider === "ynab")
    const splitwiseAccount = user.accounts.find((account) => account.provider === "splitwise")

    if (!ynabAccount?.access_token) {
      throw new Error("YNAB account not found or missing access token")
    }

    if (!splitwiseAccount?.access_token || !splitwiseAccount?.providerAccountId) {
      throw new Error("Splitwise account not found or missing access token/provider ID")
    }

    if (!user.splitwiseSettings.splitwiseEmoji) {
      throw new Error("Splitwise emoji not configured")
    }

    const ynabService = new YNABService({
      userId: user.id,
      budgetId: user.ynabSettings.budgetId,
      splitwiseAccountId: user.ynabSettings.splitwiseAccountId,
      apiKey: ynabAccount.access_token,
      ynabFlagColor: user.ynabSettings.manualFlagColor,
    })

    const splitwiseService = new SplitwiseService({
      userId: user.id,
      knownEmoji: user.splitwiseSettings.splitwiseEmoji,
      splitwiseUserId: Number(splitwiseAccount.providerAccountId),
      groupId: user.splitwiseSettings.splitwiseGroupId,
      currencyCode: user.splitwiseSettings.splitwiseCurrencyCode,
      apiKey: splitwiseAccount.access_token,
    })

    // Process transactions from YNAB to Splitwise
    const syncedTransactions = await processLatestTransactions(ynabService, splitwiseService)

    // Process expenses from Splitwise to YNAB
    const syncedExpenses = await processLatestExpenses(ynabService, splitwiseService)

    // Record synced transactions
    const createdTransactionItems =
      syncedTransactions.length > 0
        ? await Promise.all(
            syncedTransactions.map((transaction) =>
              prisma.syncedItem.create({
                data: {
                  syncHistoryId: syncHistory.id,
                  externalId: transaction.id,
                  type: "ynab_transaction",
                  amount: transaction.amount / 1000, // Convert from milliunits
                  description: transaction.payee_name || transaction.memo || "Unknown transaction",
                  date: new Date(transaction.date),
                  direction: "ynab_to_splitwise",
                },
              }),
            ),
          )
        : []

    // Record synced expenses
    const createdExpenseItems =
      syncedExpenses.length > 0
        ? await Promise.all(
            syncedExpenses.map((expense) =>
              prisma.syncedItem.create({
                data: {
                  syncHistoryId: syncHistory.id,
                  externalId: expense.id.toString(),
                  type: "splitwise_expense",
                  amount: splitwiseService.toYNABAmount(expense) / 1000,
                  description: expense.description || "Unknown expense",
                  date: new Date(expense.date),
                  direction: "splitwise_to_ynab",
                },
              }),
            ),
          )
        : []

    // Update sync history
    await prisma.syncHistory.update({
      where: { id: syncHistory.id },
      data: {
        status: "success",
        completedAt: new Date(),
      },
    })

    return {
      success: true,
      syncHistoryId: syncHistory.id,
      syncedTransactions: createdTransactionItems,
      syncedExpenses: createdExpenseItems,
    }
  } catch (error) {
    console.error("Sync error:", error)

    // Update sync history with error
    await prisma.syncHistory.update({
      where: { id: syncHistory.id },
      data: {
        status: "error",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        completedAt: new Date(),
      },
    })

    return {
      success: false,
      syncHistoryId: syncHistory.id,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function syncAllUsers(): Promise<{
  totalUsers: number
  successCount: number
  errorCount: number
  results: Record<string, SyncResult>
}> {
  // Find all fully configured users
  const configuredUsers = await prisma.user.findMany({
    where: {
      ynabSettings: {
        splitwiseAccountId: {
          not: null,
        },
      },
      splitwiseSettings: {
        splitwiseGroupId: {
          not: null,
        },
        splitwiseCurrencyCode: {
          not: null,
        },
      },
    },
    select: {
      id: true,
      email: true,
    },
  })

  console.log(`Found ${configuredUsers.length} configured users to sync`)

  const results: Record<string, SyncResult> = {}
  let successCount = 0
  let errorCount = 0

  // Sync each user
  for (const user of configuredUsers) {
    try {
      console.log(`Syncing user ${user.email || user.id}...`)
      const result = await syncUserData(user.id)
      results[user.id] = result

      if (result.success) {
        successCount++
      } else {
        errorCount++
      }
    } catch (error) {
      console.error(`Error syncing user ${user.email || user.id}:`, error)
      results[user.id] = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
      errorCount++
    }
  }

  return {
    totalUsers: configuredUsers.length,
    successCount,
    errorCount,
    results,
  }
}
