import type { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { syncSingleUser } from "@/services/sync";

export const maxDuration = 300;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { userId } = await params;

  try {
    const result = await syncSingleUser(userId);
    return Response.json(result);
  } catch (error) {
    Sentry.captureException(error, { extra: { userId } });
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
