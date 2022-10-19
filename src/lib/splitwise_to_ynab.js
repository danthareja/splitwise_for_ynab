import {
  getSplitwiseLastProcessed,
  setSplitwiseLastProcessed,
} from "@/services/db";
import {
  getUnprocessedExpenses,
  markExpenseProcessed,
} from "@/services/splitwise";
import { createTransaction } from "@/services/ynab";
import { splitwiseExpenseToYnabTransaction } from "./glue";

export async function processLatestExpenses() {
  const lastProcessedDate = await getSplitwiseLastProcessed();
  const expenses = await getUnprocessedExpenses(lastProcessedDate);

  for (let expense of expenses) {
    await createTransaction(
      splitwiseExpenseToYnabTransaction(expense, {
        isOutflow: true,
        payee: `Splitwise from ${expense.created_by.first_name}`,
      })
    );
    await markExpenseProcessed(expense);
  }

  await setSplitwiseLastProcessed();
  return expenses;
}
