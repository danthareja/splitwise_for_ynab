import type { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/db";
import { syncPairedGroup } from "@/services/sync";

export const maxDuration = 300;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { groupId } = await params;
  const body = (await request.json()) as { userIds: string[] };

  if (!Array.isArray(body.userIds) || body.userIds.length === 0) {
    return Response.json(
      { success: false, error: "userIds array is required" },
      { status: 400 },
    );
  }

  // Look up user emails from DB to build the PairedGroup
  const users = await prisma.user.findMany({
    where: { id: { in: body.userIds } },
    select: { id: true, email: true },
  });

  try {
    const result = await syncPairedGroup({ groupId, users });
    return Response.json(result);
  } catch (error) {
    Sentry.captureException(error, {
      extra: { groupId, userIds: body.userIds },
    });
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
