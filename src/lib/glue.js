export function ynabTransactionToSplitwiseExpense(transaction) {
  return {
    cost: ynabOutflowToSplitwiseCost(transaction.amount),
    description: transaction.payee_name,
    details: transaction.memo,
    date: transaction.date,
  };
}

export function splitwiseExpenseToYnabTransaction(
  expense,
  { isOutflow = false, payee } = {}
) {
  return {
    amount: isOutflow
      ? splitwiseCostToYnabOutflow(expense.repayments[0].amount)
      : splitwiseCostToYnabInflow(expense.repayments[0].amount),
    payee_name: payee ?? expense.description,
    date: expense.date,
    memo: expense.details ?? expense.description,
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
