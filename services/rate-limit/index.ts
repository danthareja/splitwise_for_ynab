import { RateLimitFactory } from "./rate-limit";

export interface UserRateLimitOptions {
  maxRequests: number;
  windowSeconds: number;
  key: string;
}

export async function enforcePerUserRateLimit(
  userId: string,
  { maxRequests, windowSeconds, key }: UserRateLimitOptions,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const limiter = await RateLimitFactory.create("prisma");
  return limiter.hit(userId, key, maxRequests, windowSeconds);
}

export { RateLimitFactory } from "./rate-limit";
