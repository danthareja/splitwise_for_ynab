// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import withMiddleware, { authorize, checkMethod } from "@/middleware";
import { MyYNABService, PartnerYNABService } from "@/services/ynab";
import {
  MySplitwiseService,
  PartnerSplitwiseService,
} from "@/services/splitwise";
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

  return res.status(400).json({ message: "Invalid params" });
};

export default withMiddleware([checkMethod("POST"), authorize], handler);
