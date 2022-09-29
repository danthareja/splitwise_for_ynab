import { createExpense } from "@/services/splitwise";
import {
  getFlaggedTransactions,
  createSplitwiseTransaction,
  unflagTransaction,
} from "@/services/ynab";
import { setServerKnowledge } from "@/services/db";

export async function processLatestTransactions() {
  const { serverKnowledge, transactions } = await getFlaggedTransactions();

  for (let transaction of transactions) {
    const expense = await createExpense(
      ynabTransactionToSplitwiseExpense(transaction)
    );

    await createSplitwiseTransaction(
      splitwiseExpenseToYnabTransaction(expense)
    );

    await unflagTransaction(transaction);
  }

  await setServerKnowledge(serverKnowledge);
  return transactions;
}

function ynabTransactionToSplitwiseExpense(transaction) {
  return {
    cost: ynabOutflowToSplitwiseCost(transaction.amount),
    description: transaction.payee_name,
    details: transaction.memo,
    date: transaction.date,
  };
}

function splitwiseExpenseToYnabTransaction(expense) {
  return {
    amount: splitwiseCostToYnabInflow(expense.repayments[0].amount),
    payee_name: expense.description,
    date: expense.date,
    memo: expense.details,
  };
}

// -32500 -> 32.50
function ynabOutflowToSplitwiseCost(ynabOutflow) {
  return `${(ynabOutflow * -1) / 1000}`;
}

// 32.50 -> -32500
function splitwiseCostToYnabInflow(splitwiseCost) {
  return parseFloat(splitwiseCost) * 1000;
}
