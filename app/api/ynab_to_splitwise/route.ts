import { NextResponse } from "next/server";
import { SyncStateFactory } from "@/services/sync-state";
import { YNABService } from "@/services/ynab";
import { SplitwiseService } from "@/services/splitwise";
import { processLatestTransactions } from "@/services/glue";
import { validateSyncRequest } from "@/lib/validations/sync-request";

export async function POST(req: Request) {
  const authorizationHeader = req.headers.get("authorization");
  const token = authorizationHeader?.split("Bearer ")?.[1];
  const allowedToken = process.env.API_SECRET_KEY;

  // Skip authorization for non-API routes or other specific paths if needed in the future
  // For now, this middleware is only applied to paths defined in the matcher

  if (!token || token !== allowedToken) {
    return NextResponse.json(
      { error: "You're not authorized", details: "Invalid token" },
      { status: 401 },
    );
  }

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
