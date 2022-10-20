// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { processLatestTransactions } from "@/lib/ynab_to_splitwise";
import { withAuthorization } from "@/middleware/authorize";

export default withAuthorization(async function handler(req, res) {
  try {
    const transactions = await processLatestTransactions();
    res.status(200).json({ data: { transactions } });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ data: e?.response?.data, error: e.message });
  }
});
