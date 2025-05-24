import { NextResponse } from "next/server";
import { MyYNABService, PartnerYNABService } from "@/services/ynab";
import {
  MySplitwiseService,
  PartnerSplitwiseService,
} from "@/services/splitwise";
import { processLatestExpenses } from "@/services/glue";

export async function POST(req: Request) {
  const body = await req.json();
  const { who } = body;

  if (who === "mine") {
    const expenses = await processLatestExpenses(
      new MyYNABService(),
      new MySplitwiseService(),
    );
    return NextResponse.json({ data: { expenses } });
  }

  if (who === "partner") {
    const expenses = await processLatestExpenses(
      new PartnerYNABService(),
      new PartnerSplitwiseService(),
    );
    return NextResponse.json({ data: { expenses } });
  }

  return NextResponse.json({ message: "Invalid params" }, { status: 400 });
}
