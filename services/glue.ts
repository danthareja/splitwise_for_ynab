import { YNABService } from "@/services/ynab";
import { SplitwiseService } from "@/services/splitwise";

export async function processLatestExpenses(ynab: YNABService, splitwise: SplitwiseService) {
  const lastProcessedDate = await splitwise.getLastProcessedDate();
  const expenses = await splitwise.getUnprocessedExpenses({
    updated_after: lastProcessedDate,
  });

  for (const expense of expenses) {
    await ynab.createTransaction(splitwise.toYNABTransaction(expense));
    await splitwise.markExpenseProcessed(expense);
  }

  await splitwise.setLastProcessedDate();
  return expenses;
}

export async function processLatestTransactions(ynab: YNABService, splitwise: SplitwiseService) {
  const lastServerKnowledge = await ynab.getServerKnowledge();
  const { serverKnowledge, transactions } =
    await ynab.getUnprocessedTransactions(lastServerKnowledge);

  for (const transaction of transactions) {
    await splitwise.createExpense(ynab.toSplitwiseExpense(transaction));
    await ynab.markTransactionProcessed(transaction);
  }

  await ynab.setServerKnowledge(serverKnowledge);
  return transactions;
}
