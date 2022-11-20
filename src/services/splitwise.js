import axios from "axios";
import pFilter from "p-filter";

const splitwise = axios.create({
  baseURL: "https://secure.splitwise.com/api/v3.0",
  headers: { Authorization: `Bearer ${process.env.SPLITWISE_API_KEY}` },
});

const FIRST_KNOWN_DATE = "2022-10-14T00:00:00Z";
const KNOWN_COMMENT = "Processed by DanBOT 9005";

export async function createExpense(data) {
  const res = await splitwise.post("/create_expense", {
    currency_code: process.env.SPLITWISE_CURRENCY_CODE,
    group_id: process.env.SPLITWISE_GROUP_ID,
    split_equally: true,
    ...data,
  });

  return res.data.expenses[0];
}

export async function getUnprocessedExpenses(lastProcessedDate) {
  const res = await splitwise.get("/get_expenses", {
    params: {
      group_id: process.env.SPLITWISE_GROUP_ID,
      // dated_after: lastProcessedDate || FIRST_KNOWN_DATE,
      limit: 10,
    },
  });

  return pFilter(res.data.expenses, isExpenseUnprocessed);
}

export async function markExpenseProcessed(expense) {
  const res = await splitwise.post("/create_comment", {
    expense_id: expense.id,
    content: KNOWN_COMMENT,
  });

  return res.data.comment;
}

export function isPartnerExpense(expense) {
  return (
    expense.repayments[0].from === parseInt(process.env.SPLITWISE_MY_USER_ID)
  );
}

async function isExpenseUnprocessed(expense) {
  const isDeleted = !!expense.deleted_at;

  if (isDeleted) {
    return false;
  }

  const comments = await getComments(expense.id);
  const hasKnownComment = comments.find(
    (comment) => comment.content === KNOWN_COMMENT
  );

  return !hasKnownComment;
}

async function getComments(expense_id) {
  const res = await splitwise.get("/get_comments", {
    params: {
      expense_id,
    },
  });

  return res.data.comments;
}
