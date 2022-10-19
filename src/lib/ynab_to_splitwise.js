import { getServerKnowledge, setServerKnowledge } from "@/services/db";
import { createExpense, markExpenseProcessed } from "@/services/splitwise";
import {
  getUnprocessedTransactions,
  markTransactionProcessed,
  createTransaction,
} from "@/services/ynab";
import {
  ynabTransactionToSplitwiseExpense,
  splitwiseExpenseToYnabTransaction,
} from "./glue";

export async function processLatestTransactions() {
  const lastServerKnowledge = await getServerKnowledge();
  const { serverKnowledge, transactions } = await getUnprocessedTransactions(
    lastServerKnowledge
  );

  for (let transaction of transactions) {
    const expense = await createExpense(
      ynabTransactionToSplitwiseExpense(transaction)
    );
    await markExpenseProcessed(expense);
    await createTransaction(splitwiseExpenseToYnabTransaction(expense));
    await markTransactionProcessed(transaction);
  }

  await setServerKnowledge(serverKnowledge);
  return transactions;
}
