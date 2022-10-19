import { getServerKnowledge, setServerKnowledge } from "@/services/db";
import { createExpense } from "@/services/splitwise";
import {
  getUnprocessedTransactions,
  markTransactionProcessed,
} from "@/services/ynab";
import { ynabTransactionToSplitwiseExpense } from "./glue";

export async function processLatestTransactions() {
  const lastServerKnowledge = await getServerKnowledge();
  const { serverKnowledge, transactions } = await getUnprocessedTransactions(
    lastServerKnowledge
  );

  for (let transaction of transactions) {
    await createExpense(ynabTransactionToSplitwiseExpense(transaction));
    await markTransactionProcessed(transaction);
  }

  await setServerKnowledge(serverKnowledge);
  return transactions;
}
