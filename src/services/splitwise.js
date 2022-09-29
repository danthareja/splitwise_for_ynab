import axios from "axios";

const splitwise = axios.create({
  baseURL: "https://secure.splitwise.com/api/v3.0",
  headers: { Authorization: `Bearer ${process.env.SPLITWISE_API_KEY}` },
});

export async function createExpense(data) {
  const res = await splitwise.post("/create_expense", {
    currency_code: process.env.SPLITWISE_CURRENCY_CODE,
    group_id: process.env.SPLITWISE_GROUP_ID,
    split_equally: true,
    ...data,
  });

  return res.data.expenses[0];
}
