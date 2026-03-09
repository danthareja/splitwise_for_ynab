import type { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/db";

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  const stalePending = await prisma.syncHistory.findMany({
    where: {
      status: "pending",
      startedAt: { lt: tenMinutesAgo },
    },
    include: {
      user: { select: { email: true } },
    },
  });

  if (stalePending.length === 0) {
    return Response.json({ success: true, staleCount: 0 });
  }

  // Mark all stale records as error
  await prisma.syncHistory.updateMany({
    where: {
      id: { in: stalePending.map((s) => s.id) },
    },
    data: {
      status: "error",
      errorMessage: "Sync timed out (stale pending)",
      completedAt: new Date(),
    },
  });

  // Fire a Sentry alert for each stale record
  for (const record of stalePending) {
    Sentry.captureMessage("Stale pending sync detected", {
      level: "error",
      extra: {
        userId: record.userId,
        userEmail: record.user?.email,
        syncHistoryId: record.id,
        startedAt: record.startedAt.toISOString(),
      },
    });
  }

  console.log(`Marked ${stalePending.length} stale pending syncs as error`);

  return Response.json({
    success: true,
    staleCount: stalePending.length,
    staleIds: stalePending.map((s) => s.id),
  });
}
