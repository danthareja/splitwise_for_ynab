import { NextResponse } from "next/server";
import { SyncStateFactory } from "@/services/sync-state";
import { YNABService } from "@/services/ynab";
import { SplitwiseService } from "@/services/splitwise";
import { processLatestTransactions } from "@/services/glue";
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
    userId: ynab.userId,
    budgetId: ynab.budgetId,
    splitwiseAccountId: ynab.splitwiseAccountId,
    apiKey: ynab.apiKey,
    manualFlagColor: ynab.manualFlagColor,
    syncedFlagColor: ynab.syncedFlagColor,
    syncState: syncStateService,
  });

  const splitwiseService = new SplitwiseService({
    userId: splitwise.userId,
    knownEmoji: splitwise.knownEmoji,
    splitwiseUserId: splitwise.splitwiseUserId,
    groupId: splitwise.groupId,
    currencyCode: splitwise.currencyCode,
    apiKey: splitwise.apiKey,
    syncState: syncStateService,
  });

  const transactions = await processLatestTransactions(
    ynabService,
    splitwiseService,
  );

  return NextResponse.json({
    data: { transactions },
  });
}
