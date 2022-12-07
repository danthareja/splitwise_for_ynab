export async function processLatestExpenses(ynab, splitwise) {
  const lastProcessedDate = await splitwise.getLastProcessedDate();
  const expenses = await splitwise.getUnprocessedExpenses(lastProcessedDate);

  for (let expense of expenses) {
    await ynab.createTransaction(splitwise.toYNABTransaction(expense));
    await splitwise.markExpenseProcessed(expense);
  }

  await splitwise.setLastProcessedDate();
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
