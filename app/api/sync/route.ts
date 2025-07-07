import type { NextRequest } from "next/server";
import { prisma } from "@/db";
import { syncAllUsers, syncUserData } from "@/services/sync";
import { enforcePerUserRateLimit } from "@/services/rate-limit";
import { getRateLimitOptions } from "@/lib/rate-limit";
import { isUserFullyConfigured } from "@/app/actions/db";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return Response.json(
      { success: false, error: "Unauthorized" },
      {
        status: 401,
      },
    );
  }

  const token = authHeader.slice("Bearer ".length).trim();

  if (token === process.env.CRON_SECRET) {
    const result = await syncAllUsers();
    return Response.json(result);
  }

  const user = await prisma.user.findFirst({
    where: { apiKey: token },
  });

  if (!user) {
    return Response.json(
      { success: false, error: "Unauthorized" },
      {
        status: 401,
      },
    );
  }

  const isFullyConfigured = await isUserFullyConfigured(user.id);
  if (!isFullyConfigured) {
    return Response.json(
      {
        success: false,
        error:
          "You must complete your Splitwise and YNAB configuration before syncing",
      },
      {
        status: 403,
      },
    );
  }

  // Check if user account is disabled
  if (user.disabled) {
    return Response.json(
      {
        success: false,
        error: user.disabledReason || "Your account has been disabled",
        suggestedFix: user.suggestedFix,
      },
      {
        status: 403,
      },
    );
  }

  const rateLimitOpts = getRateLimitOptions();
  const { allowed, retryAfterSeconds } = await enforcePerUserRateLimit(
    user.id,
    rateLimitOpts,
  );

  if (!allowed) {
    return Response.json(
      {
        success: false,
        error: `You can trigger at most ${rateLimitOpts.maxRequests} manual syncs every ${rateLimitOpts.windowSeconds / 60} minutes. Try again in ${Math.ceil(retryAfterSeconds / 60)} minutes`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": retryAfterSeconds.toString(),
        },
      },
    );
  }

  const result = await syncUserData(user.id);
  return Response.json(result);
}
