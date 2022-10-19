// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { processLatestExpenses } from "@/lib/splitwise_to_ynab";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res
      .status(405)
      .json({ data: null, error: "Idk what to do unless you POST" });
    return;
  }

  const { authorization } = req.headers;

  if (authorization !== `Bearer ${process.env.API_SECRET_KEY}`) {
    res.status(401).json({ data: null, error: "Incorrect password" });
    return;
  }

  try {
    const expenses = await processLatestExpenses();
    res.status(200).json({ data: { expenses } });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ data: e?.response?.data, error: e.message });
  }
}
