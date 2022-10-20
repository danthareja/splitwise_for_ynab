// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { processLatestTransactions } from "@/lib/ynab_to_splitwise";
import withMiddleware, { authorize, checkMethod } from "@/middleware";

const handler = async (req, res) => {
  const transactions = await processLatestTransactions();
  res.status(200).json({ data: { transactions } });
};

export default withMiddleware([checkMethod("POST"), authorize], handler);
