import {
  getRateLimitForUser,
  type UserSubscriptionData,
} from "@/services/subscription";

export const MAX_REQUESTS = Number(process.env.USER_SYNC_MAX_REQUESTS ?? 2);
export const WINDOW_SECONDS = Number(
  process.env.USER_SYNC_WINDOW_SECONDS ?? 3600,
);

/**
 * Get rate limit options for a user based on their subscription tier
 * Free: 2/hour, 6/day
 * Premium: Unlimited (9999/hour)
 *
 * Accepts either userId (DB query) or UserSubscriptionData (from session - fast!)
 */
export async function getRateLimitOptionsForUser(
  userIdOrData: string | UserSubscriptionData,
) {
  const limits =
    typeof userIdOrData === "string"
      ? await getRateLimitForUser(userIdOrData)
      : getRateLimitForUser(userIdOrData);

  return {
    hourly: {
      maxRequests: limits.hourly,
      windowSeconds: 3600, // 1 hour
      key: "sync_hourly" as const,
    },
    daily: {
      maxRequests: limits.daily,
      windowSeconds: 86400, // 24 hours
      key: "sync_daily" as const,
    },
  };
}

/**
 * Legacy function for backwards compatibility
 * Returns free tier limits
 */
export function getRateLimitOptions() {
  return {
    maxRequests: MAX_REQUESTS,
    windowSeconds: WINDOW_SECONDS,
    key: "sync" as const,
  };
}
