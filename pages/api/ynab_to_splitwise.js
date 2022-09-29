// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { processLatestTransactions } from "@/lib/ynab_to_splitwise";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ data: null, error: "Method Not Allowed" });
    return;
  }

  const { authorization } = req.headers;
  if (authorization !== `Bearer ${process.env.API_SECRET_KEY}`) {
    res.status(401).json({ data: null, error: "Unauthorized" });
    return;
  } else {
  }

  try {
    const transactions = await processLatestTransactions();
    res.status(200).json({ data: { transactions } });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ data: e?.response?.data, error: e });
  }
}
