export async function processLatestExpenses(ynab, splitwise) {
  const expenses = await splitwise.getUnprocessedExpenses();

  for (let expense of expenses) {
    await ynab.createTransaction(splitwise.toYNABTransaction(expense));
    await splitwise.markExpenseProcessed(expense);
  }

  return expenses;
}

export async function processLatestTransactions(ynab, splitwise) {
  const lastServerKnowledge = await ynab.getServerKnowledge();
  const { serverKnowledge, transactions } =
    await ynab.getUnprocessedTransactions(lastServerKnowledge);

  for (let transaction of transactions) {
    await splitwise.createExpense(ynab.toSplitwiseExpense(transaction));
    await ynab.markTransactionProcessed(transaction);
  }

  await ynab.setServerKnowledge(serverKnowledge);
  return transactions;
}
