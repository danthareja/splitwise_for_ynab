/* eslint-disable @typescript-eslint/no-unused-vars */

import { RateLimit, RateLimitOptions } from "./rate-limit";

export class UpstashRateLimit implements RateLimit {
  constructor(_options?: RateLimitOptions) {}

  // Currently unimplemented – always allow.
  async hit(
    _userId: string,
    _key: string,
    _maxRequests: number,
    _windowSeconds: number,
  ): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
    return { allowed: true, retryAfterSeconds: _windowSeconds };
  }
}
