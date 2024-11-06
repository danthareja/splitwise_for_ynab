// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import withMiddleware, { authorize, checkMethod } from "@/middleware";
import { YNABService, MyYNABService, PartnerYNABService } from "@/services/ynab";
import {
  SplitwiseService,
  MySplitwiseService,
  PartnerSplitwiseService,
} from "@/services/splitwise";
import { KeyValueStore } from "@/services/db";
import { processLatestTransactions } from "@/lib/glue";

const handler = async (req, res) => {
  const { who } = req.body;

  if (who === "mine") {
    const transactions = await processLatestTransactions(
      new MyYNABService(),
      new MySplitwiseService()
    );
    return res.status(200).json({
      data: { transactions },
    });
  }

  if (who === "partner") {
    const transactions = await processLatestTransactions(
      new PartnerYNABService(),
      new PartnerSplitwiseService()
    );
    return res.status(200).json({
      data: { transactions },
    });
  }

  if (who === "2024.11 LA") {
    const transactions = await processLatestTransactions(
      new YNABService({
        db: new KeyValueStore("ynab:2024_11_la_last_processed"),
        budgetId: process.env.YNAB_2024_11_LA_BUDGET_ID,
        splitwiseAccountId: process.env.YNAB_MY_SPLITWISE_ACCOUNT_ID
      }),
      new SplitwiseService({
        db: new KeyValueStore("splitwise:2024_11_la_last_processed"),
        knownEmoji: "🏖️",
        userId: parseInt(process.env.SPLITWISE_MY_USER_ID),
        apiKey: process.env.SPLITWISE_MY_API_KEY,
        groupId: process.env.SPLITWISE_2024_11_LA_GROUP_ID,
        currencyCode: "USD",
      })
    );
    return res.status(200).json({
      data: { transactions },
    });
  }

  return res.status(400).json({ message: "Invalid params" });
};

export default withMiddleware([checkMethod("POST"), authorize], handler);
