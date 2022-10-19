import { isPartnerExpense } from "@/services/splitwise";

export function ynabTransactionToSplitwiseExpense(transaction) {
  return {
    cost: ynabOutflowToSplitwiseCost(transaction.amount),
    description: transaction.payee_name,
    details: transaction.memo,
    date: transaction.date,
  };
}

export function splitwiseExpenseToYnabTransaction(expense) {
  // My partner doesn't input the payee_name in the description,
  // So we'll compute a consistent payee here to avoid polluting the payee list
  if (isPartnerExpense(expense)) {
    return {
      amount: splitwiseCostToYnabOutflow(expense.repayments[0].amount),
      payee_name: `Splitwise from ${expense.created_by.first_name}`,
      memo: expense.description,
      date: expense.date,
    };
  }

  // My expenses are auto-generated by `ynabTransactionToSplitwiseExpense`
  // so the same fields can be re-used here
  return {
    amount: splitwiseCostToYnabInflow(expense.repayments[0].amount),
    payee_name: expense.description,
    memo: expense.details,
    date: expense.date,
  };
}

// -32500 -> 32.50
export function ynabOutflowToSplitwiseCost(ynabOutflow) {
  return `${(ynabOutflow * -1) / 1000}`;
}

// 32.50 -> 32500
export function splitwiseCostToYnabInflow(splitwiseCost) {
  return parseFloat(splitwiseCost) * 1000;
}

// 32.50 -> -32500
export function splitwiseCostToYnabOutflow(splitwiseCost) {
  return splitwiseCostToYnabInflow(splitwiseCost) * -1;
}
