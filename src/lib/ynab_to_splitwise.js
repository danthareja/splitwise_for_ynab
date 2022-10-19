import { getServerKnowledge, setServerKnowledge } from "@/services/db";
import { createExpense, markExpenseProcessed } from "@/services/splitwise";
import {
  getFlaggedTransactions,
  createSplitwiseTransaction,
  unflagTransaction,
} from "@/services/ynab";
import {
  ynabTransactionToSplitwiseExpense,
  splitwiseExpenseToYnabTransaction,
} from "./glue";

export async function processLatestTransactions() {
  const lastServerKnowledge = await getServerKnowledge();

  const { serverKnowledge, transactions } = await getFlaggedTransactions(
    lastServerKnowledge
  );

  for (let transaction of transactions) {
    const expense = await createExpense(
      ynabTransactionToSplitwiseExpense(transaction)
    );

    await markExpenseProcessed(expense.id);

    await createSplitwiseTransaction(
      splitwiseExpenseToYnabTransaction(expense)
    );

    await unflagTransaction(transaction);
  }

  await setServerKnowledge(serverKnowledge);
  return transactions;
}
