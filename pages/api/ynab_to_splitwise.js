// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import withMiddleware, { authorize, checkMethod } from "@/middleware";
import { MyYNABService, PartnerYNABService } from "@/services/ynab";
import {
  MySplitwiseService,
  PartnerSplitwiseService,
} from "@/services/splitwise";
import { processLatestTransactions } from "@/lib/glue";

const handler = async (req, res) => {
  const myTransactions = await processLatestTransactions(
    new MyYNABService(),
    new MySplitwiseService()
  );

  const partnerTransactions = await processLatestTransactions(
    new PartnerYNABService(),
    new PartnerSplitwiseService()
  );

  const transactions = [...myTransactions, ...partnerTransactions];

  res.status(200).json({
    data: { transactions },
  });
};

export default withMiddleware([checkMethod("POST"), authorize], handler);
