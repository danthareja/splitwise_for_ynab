import axios from "axios";

const ynab = axios.create({
  baseURL: "https://api.youneedabudget.com/v1",
  headers: { Authorization: `Bearer ${process.env.YNAB_API_KEY}` },
});

export async function getUnprocessedTransactions(serverKnowledge) {
  const { data } = await getTransactions({
    last_knowledge_of_server: serverKnowledge,
  });

  return {
    transactions: data.transactions.filter(isTransactionUnprocessed),
    serverKnowledge: data.server_knowledge,
  };
}

export async function markTransactionProcessed(transaction) {
  return updateTransaction(transaction.id, {
    ...transaction,
    flag_color: null,
  });
}

export async function createTransaction(data) {
  const res = await ynab.post(
    `/budgets/${process.env.YNAB_BUDGET_ID}/transactions`,
    {
      transaction: {
        account_id: process.env.YNAB_SPLITWISE_ACCOUNT_ID,
        ...data,
      },
    }
  );

  return res.data;
}

export async function updateTransaction(id, data) {
  const res = await ynab.put(
    `/budgets/${process.env.YNAB_BUDGET_ID}/transactions/${id}`,
    {
      transaction: data,
    }
  );

  return res.data;
}

export async function getTransactions(params) {
  const res = await ynab.get(
    `/budgets/${process.env.YNAB_BUDGET_ID}/transactions`,
    {
      params,
    }
  );

  return res.data;
}

function isTransactionUnprocessed(transaction) {
  return (
    transaction.flag_color === process.env.YNAB_FLAG_COLOR &&
    transaction.account_id !== process.env.YNAB_SPLITWISE_ACCOUNT_ID
  );
}
