// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import withMiddleware, { authorize, checkMethod } from "@/middleware";
import { MyYNABService, PartnerYNABService } from "@/services/ynab";
import {
  MySplitwiseService,
  PartnerSplitwiseService,
} from "@/services/splitwise";
import { processLatestExpenses } from "@/lib/glue";

const handler = async (req, res) => {
  const myExpenses = await processLatestExpenses(
    new MyYNABService(),
    new MySplitwiseService()
  );

  const partnerExpenses = await processLatestExpenses(
    new PartnerYNABService(),
    new PartnerSplitwiseService()
  );

  const expenses = [...myExpenses, ...partnerExpenses];

  res.status(200).json({ data: { expenses } });
};

export default withMiddleware([checkMethod("POST"), authorize], handler);
