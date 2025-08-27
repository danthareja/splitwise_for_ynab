import { YNABService } from "@/services/ynab";
import { SplitwiseService } from "@/services/splitwise";
import type { YNABTransaction } from "@/types/ynab";
import type { SplitwiseExpense } from "@/types/splitwise";
import { YNABBadRequestError } from "./ynab-axios";
import { SplitwiseBadRequestError } from "./splitwise-axios";

export async function processLatestExpenses(
  ynab: YNABService,
  splitwise: SplitwiseService,
): Promise<{
  successful: SplitwiseExpense[];
  failed: {
    expense: SplitwiseExpense;
    error: Error;
  }[];
}> {
  const lastProcessedDate = await splitwise.getLastProcessedDate();
  console.log(
    `📅 [processLatestExpenses] Last processed date: ${lastProcessedDate || "Never"}`,
  );

  const expenses = await splitwise.getUnprocessedExpenses({
    updated_after: lastProcessedDate,
  });

  const successful = [];
  const failed = [];

  console.log(
    `📋 [processLatestExpenses] Found ${expenses.length} unprocessed Splitwise expenses`,
  );

  for (const [index, expense] of expenses.entries()) {
    console.log(
      `🔄 [processLatestExpenses] Processing expense ${index + 1}/${expenses.length}: ${expense.description || expense.id}`,
    );

    try {
      const ynabTransaction = splitwise.toYNABTransaction(expense);
      await ynab.createTransaction(ynabTransaction);
      console.log(
        `✅ [processLatestExpenses] Created YNAB transaction for expense ${expense.id}`,
      );

      await splitwise.markExpenseProcessed(expense);
      console.log(
        `✅ [processLatestExpenses] Marked Splitwise expense ${expense.id} as processed`,
      );
      successful.push(expense);
    } catch (error) {
      console.error(
        `❌ [processLatestExpenses] Error processing expense ${expense.id}: ${error instanceof Error ? error.message : String(error)}`,
      );

      if (error instanceof YNABBadRequestError) {
        failed.push({ expense, error });
      } else {
        throw error;
      }
    }
  }

  await splitwise.setLastProcessedDate();
  console.log(
    `✅ [processLatestExpenses] Complete! Processed ${expenses.length} expenses. ${successful.length} successful, ${failed.length} failed`,
  );

  return { successful, failed };
}

export async function processLatestTransactions(
  ynab: YNABService,
  splitwise: SplitwiseService,
): Promise<{
  successful: YNABTransaction[];
  failed: {
    transaction: YNABTransaction;
    error: Error;
  }[];
}> {
  const lastServerKnowledge = await ynab.getServerKnowledge();
  console.log(
    `📊 [processLatestTransactions] Last server knowledge: ${lastServerKnowledge || "None"}`,
  );

  const { serverKnowledge, transactions } =
    await ynab.getUnprocessedTransactions(lastServerKnowledge);

  console.log(
    `📋 [processLatestTransactions] Found ${transactions.length} unprocessed YNAB transactions`,
  );

  const successful = [];
  const failed = [];

  for (const [index, transaction] of transactions.entries()) {
    console.log(
      `🔄 [processLatestTransactions] Processing transaction ${index + 1}/${transactions.length}: ${transaction.payee_name || transaction.id}`,
    );

    try {
      const splitwiseExpense = ynab.toSplitwiseExpense(transaction);
      await splitwise.createExpense(splitwiseExpense);
      console.log(
        `✅ [processLatestTransactions] Created Splitwise expense for transaction ${transaction.id}`,
      );

      await ynab.markTransactionProcessed(transaction);
      console.log(
        `✅ [processLatestTransactions] Marked YNAB transaction ${transaction.id} as processed`,
      );
      successful.push(transaction);
    } catch (error) {
      console.error(
        `❌ [processLatestTransactions] Error processing transaction ${transaction.id}: ${error instanceof Error ? error.message : String(error)}`,
      );

      if (error instanceof SplitwiseBadRequestError) {
        console.error(error);
        failed.push({ transaction, error });
      } else {
        throw error;
      }
    }
  }

  await ynab.setServerKnowledge(serverKnowledge);
  console.log(
    `✅ [processLatestTransactions] Complete! Processed ${transactions.length} transactions. ${successful.length} successful, ${failed.length} failed`,
  );

  return { successful, failed };
}
