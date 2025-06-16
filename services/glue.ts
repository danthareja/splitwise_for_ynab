import { YNABService } from "@/services/ynab";
import { SplitwiseService } from "@/services/splitwise";
import type { YNABTransaction } from "@/types/ynab";
import type { SplitwiseExpense } from "@/types/splitwise";

export async function processLatestExpenses(
  ynab: YNABService,
  splitwise: SplitwiseService,
): Promise<SplitwiseExpense[]> {
  console.log(
    `🔍 [processLatestExpenses] Getting last processed date from Splitwise...`,
  );
  const lastProcessedDate = await splitwise.getLastProcessedDate();
  console.log(
    `📅 [processLatestExpenses] Last processed date: ${lastProcessedDate || "Never"}`,
  );

  console.log(
    `🔍 [processLatestExpenses] Fetching unprocessed Splitwise expenses...`,
  );
  const expenses = await splitwise.getUnprocessedExpenses({
    updated_after: lastProcessedDate,
  });

  console.log(
    `📋 [processLatestExpenses] Found ${expenses.length} unprocessed Splitwise expenses`,
  );

  if (expenses.length > 0) {
    console.log(`💰 [processLatestExpenses] Processing Splitwise expenses:`);
    expenses.forEach((expense, idx) => {
      console.log(
        `   ${idx + 1}. ${expense.description || "No description"} - ID: ${expense.id}, Date: ${expense.date}`,
      );
    });
  }

  for (const [index, expense] of expenses.entries()) {
    console.log(
      `🔄 [processLatestExpenses] Processing expense ${index + 1}/${expenses.length}: ${expense.description || expense.id}`,
    );

    try {
      const ynabTransaction = splitwise.toYNABTransaction(expense);
      console.log(
        `📝 [processLatestExpenses] Converting to YNAB transaction:`,
        {
          amount: ynabTransaction.amount,
          payee: ynabTransaction.payee_name,
          memo: ynabTransaction.memo,
        },
      );

      await ynab.createTransaction(ynabTransaction);
      console.log(
        `✅ [processLatestExpenses] Created YNAB transaction for expense ${expense.id}`,
      );

      await splitwise.markExpenseProcessed(expense);
      console.log(
        `✅ [processLatestExpenses] Marked Splitwise expense ${expense.id} as processed`,
      );
    } catch (error) {
      console.error(
        `❌ [processLatestExpenses] Error processing expense ${expense.id}:`,
        error,
      );
      throw error;
    }
  }

  console.log(`💾 [processLatestExpenses] Updating last processed date...`);
  await splitwise.setLastProcessedDate();
  console.log(
    `✅ [processLatestExpenses] Complete! Processed ${expenses.length} expenses`,
  );

  return expenses;
}

export async function processLatestTransactions(
  ynab: YNABService,
  splitwise: SplitwiseService,
): Promise<YNABTransaction[]> {
  console.log(
    `🔍 [processLatestTransactions] Getting YNAB server knowledge...`,
  );
  const lastServerKnowledge = await ynab.getServerKnowledge();
  console.log(
    `📊 [processLatestTransactions] Last server knowledge: ${lastServerKnowledge || "None"}`,
  );

  console.log(
    `🔍 [processLatestTransactions] Fetching unprocessed YNAB transactions...`,
  );
  const { serverKnowledge, transactions } =
    await ynab.getUnprocessedTransactions(lastServerKnowledge);

  console.log(
    `📋 [processLatestTransactions] Found ${transactions.length} unprocessed YNAB transactions`,
  );
  console.log(
    `📊 [processLatestTransactions] New server knowledge: ${serverKnowledge}`,
  );

  if (transactions.length > 0) {
    console.log(`💰 [processLatestTransactions] Processing YNAB transactions:`);
    transactions.forEach((transaction, idx) => {
      const amount = transaction.amount / 1000; // Convert from milliunits
      const description =
        transaction.payee_name || transaction.memo || "No description";
      console.log(
        `   ${idx + 1}. ${description} - $${amount} (ID: ${transaction.id}, Date: ${transaction.date})`,
      );
    });
  }

  for (const [index, transaction] of transactions.entries()) {
    console.log(
      `🔄 [processLatestTransactions] Processing transaction ${index + 1}/${transactions.length}: ${transaction.payee_name || transaction.id}`,
    );

    try {
      const splitwiseExpense = ynab.toSplitwiseExpense(transaction);
      console.log(
        `📝 [processLatestTransactions] Converting to Splitwise expense:`,
        {
          description: splitwiseExpense.description,
          cost: splitwiseExpense.cost,
          details: splitwiseExpense.details,
          date: splitwiseExpense.date,
        },
      );

      await splitwise.createExpense(splitwiseExpense);
      console.log(
        `✅ [processLatestTransactions] Created Splitwise expense for transaction ${transaction.id}`,
      );

      await ynab.markTransactionProcessed(transaction);
      console.log(
        `✅ [processLatestTransactions] Marked YNAB transaction ${transaction.id} as processed`,
      );
    } catch (error) {
      console.error(
        `❌ [processLatestTransactions] Error processing transaction ${transaction.id}:`,
        error,
      );
      throw error;
    }
  }

  console.log(
    `💾 [processLatestTransactions] Updating YNAB server knowledge to: ${serverKnowledge}`,
  );
  await ynab.setServerKnowledge(serverKnowledge);
  console.log(
    `✅ [processLatestTransactions] Complete! Processed ${transactions.length} transactions`,
  );

  return transactions;
}
