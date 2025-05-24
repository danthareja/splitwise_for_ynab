import { NextResponse } from "next/server";
import { MyYNABService, PartnerYNABService } from "@/services/ynab";
import {
  MySplitwiseService,
  PartnerSplitwiseService,
} from "@/services/splitwise";
import { processLatestTransactions } from "@/services/glue";

export async function POST(req: Request) {
  const body = await req.json();
  const { who } = body;

  if (who === "mine") {
    const transactions = await processLatestTransactions(
      new MyYNABService(),
      new MySplitwiseService(),
    );
    return NextResponse.json({
      data: { transactions },
    });
  }

  if (who === "partner") {
    const transactions = await processLatestTransactions(
      new PartnerYNABService(),
      new PartnerSplitwiseService(),
    );
    return NextResponse.json({
      data: { transactions },
    });
  }

  return NextResponse.json({ message: "Invalid params" }, { status: 400 });
}
