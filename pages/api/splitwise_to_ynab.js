// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { processLatestExpenses } from "@/lib/splitwise_to_ynab";
import withMiddleware, { authorize, checkMethod } from "@/middleware";

const handler = async (req, res) => {
  const expenses = await processLatestExpenses();
  res.status(200).json({ data: { expenses } });
};

export default withMiddleware([checkMethod("POST"), authorize], handler);
