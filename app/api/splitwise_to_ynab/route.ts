import { NextResponse } from "next/server";
import { SyncStateFactory } from "@/services/sync-state";
import { YNABService } from "@/services/ynab";
import { SplitwiseService } from "@/services/splitwise";
import { processLatestExpenses } from "@/services/glue";
import { validateSyncRequest } from "@/lib/validations/sync-request";

export async function POST(req: Request) {
  const body = await req.json();

  // Validate the request using shared validation
  const validation = validateSyncRequest(body);
  if (!validation.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: validation.errors,
      },
      { status: 400 },
    );
  }

  const { ynab, splitwise, syncState } = validation.data;

  const syncStateService = await SyncStateFactory.create(
    syncState.strategy,
    syncState.options,
  );

  const ynabService = new YNABService({
    apiKey: ynab.apiKey,
    userId: ynab.userId,
    budgetId: ynab.budgetId,
    splitwiseAccountId: ynab.splitwiseAccountId,
    manualFlagColor: ynab.manualFlagColor,
    syncedFlagColor: ynab.syncedFlagColor,
    syncState: syncStateService,
  });

  const splitwiseService = new SplitwiseService({
    apiKey: splitwise.apiKey,
    userId: splitwise.userId,
    splitwiseUserId: splitwise.splitwiseUserId,
    groupId: splitwise.groupId,
    knownEmoji: splitwise.knownEmoji,
    currencyCode: splitwise.currencyCode,
    syncState: syncStateService,
  });

  const expenses = await processLatestExpenses(ynabService, splitwiseService);

  return NextResponse.json({ data: { expenses } });
}
