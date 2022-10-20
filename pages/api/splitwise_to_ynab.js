// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { processLatestExpenses } from "@/lib/splitwise_to_ynab";
import { withAuthorization } from "@/middleware/authorize";

export default withAuthorization(async function handler(req, res) {
  try {
    const expenses = await processLatestExpenses();
    res.status(200).json({ data: { expenses } });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ data: e?.response?.data, error: e.message });
  }
});
