import type { NextRequest } from "next/server";
import { prisma } from "@/db";
import { syncAllUsers, syncUserData } from "@/services/sync";
import { enforcePerUserRateLimit } from "@/services/rate-limit";
import { getRateLimitOptionsForUser } from "@/lib/rate-limit";
import { isUserFullyConfigured } from "@/app/actions/db";
import { canAccessFeature } from "@/services/subscription";

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

  // Check if user has API access (premium feature)
  const hasApiAccess = await canAccessFeature(user.id, "api_access");
  if (!hasApiAccess) {
    return Response.json(
      {
        success: false,
        error:
          "API access is a Premium feature. Upgrade to Premium to use API keys for programmatic syncing.",
        upgrade: true,
      },
      {
        status: 403,
      },
    );
  }

  // Get subscription-aware rate limits
  const rateLimits = await getRateLimitOptionsForUser(user.id);

  // Check hourly limit
  const hourlyCheck = await enforcePerUserRateLimit(user.id, rateLimits.hourly);

  if (!hourlyCheck.allowed) {
    return Response.json(
      {
        success: false,
        error: `Hourly rate limit exceeded (${rateLimits.hourly.maxRequests} per hour). Try again in ${Math.ceil(hourlyCheck.retryAfterSeconds / 60)} minutes.`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": hourlyCheck.retryAfterSeconds.toString(),
        },
      },
    );
  }

  // Check daily limit
  const dailyCheck = await enforcePerUserRateLimit(user.id, rateLimits.daily);

  if (!dailyCheck.allowed) {
    return Response.json(
      {
        success: false,
        error: `Daily rate limit exceeded (${rateLimits.daily.maxRequests} per day). Try again in ${Math.ceil(dailyCheck.retryAfterSeconds / 3600)} hours.`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": dailyCheck.retryAfterSeconds.toString(),
        },
      },
    );
  }

  const result = await syncUserData(user.id);
  return Response.json(result);
}
