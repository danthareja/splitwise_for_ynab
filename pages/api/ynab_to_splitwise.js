// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { processLatestTransactions } from "@/lib/ynab_to_splitwise";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res
      .status(405)
      .json({ data: null, error: "Idk what to do unless you POST" });
    return;
  }

  const { authorization } = req.headers;
  console.log(authorization);
  if (authorization !== `Bearer ${process.env.API_SECRET_KEY}`) {
    res.status(401).json({ data: null, error: "Incorrect password" });
    return;
  }

  try {
    const transactions = await processLatestTransactions();
    res.status(200).json({ data: { transactions } });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ data: e?.response?.data, error: e.message });
  }
}
