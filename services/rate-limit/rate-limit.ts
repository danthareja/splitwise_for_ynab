export interface RateLimit {
  /**
   * Register a hit for a given user/key combination and return whether the
   * request is allowed (i.e. the rate limit has NOT been exceeded).
   */
  hit(
    userId: string,
    key: string,
    maxRequests: number,
    windowSeconds: number,
  ): Promise<{ allowed: boolean; retryAfterSeconds: number }>;
}

export type RateLimitOptions = Record<string, never>;

export class RateLimitFactory {
  static async create(
    strategy: "prisma" | "upstash" = "prisma",
    _options?: RateLimitOptions,
  ): Promise<RateLimit> {
    switch (strategy) {
      case "upstash": {
        const { UpstashRateLimit } = await import("./rate-limit-upstash");
        return new UpstashRateLimit(_options);
      }
      case "prisma":
      default: {
        const { PrismaRateLimit } = await import("./rate-limit-prisma");
        return new PrismaRateLimit();
      }
    }
  }
}
