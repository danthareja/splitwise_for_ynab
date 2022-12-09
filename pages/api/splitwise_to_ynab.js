// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import withMiddleware, { authorize, checkMethod } from "@/middleware";
import { MyYNABService, PartnerYNABService } from "@/services/ynab";
import {
  MySplitwiseService,
  PartnerSplitwiseService,
} from "@/services/splitwise";
import { processLatestExpenses } from "@/lib/glue";

const handler = async (req, res) => {
  const { who } = req.body;

  if (who === "mine") {
    const expenses = await processLatestExpenses(
      new MyYNABService(),
      new MySplitwiseService()
    );
    return res.status(200).json({ data: { expenses } });
  }

  if (who === "partner") {
    const expenses = await processLatestExpenses(
      new PartnerYNABService(),
      new PartnerSplitwiseService()
    );
    return res.status(200).json({ data: { expenses } });
  }

  return res.status(400).json({ message: "Invalid params" });
};

export default withMiddleware([checkMethod("POST"), authorize], handler);
