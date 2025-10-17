import { describe, it, expect, beforeEach } from "vitest";
import { PrismaRateLimit } from "@/services/rate-limit/rate-limit-prisma";
import { prisma } from "../../setup";
import { createTestUser } from "../../factories/test-data";

describe("PrismaRateLimit", () => {
  let rateLimit: PrismaRateLimit;
  let userId: string;
  const key = "manual-sync";

  beforeEach(async () => {
    rateLimit = new PrismaRateLimit();
    // Create a user for foreign key constraints
    const user = await createTestUser();
    userId = user.id;
  });

  describe("hit", () => {
    it("should allow first request", async () => {
      const result = await rateLimit.hit(userId, key, 3, 60);

      expect(result.allowed).toBe(true);
      expect(result.retryAfterSeconds).toBe(60);

      // Verify database record was created
      const record = await prisma.rateLimit.findUnique({
        where: { userId_key: { userId, key } },
      });
      expect(record).toBeDefined();
      expect(record!.count).toBe(1);
    });

    it("should allow requests within limit", async () => {
      const maxRequests = 3;
      const windowSeconds = 60;

      const result1 = await rateLimit.hit(
        userId,
        key,
        maxRequests,
        windowSeconds,
      );
      expect(result1.allowed).toBe(true);

      const result2 = await rateLimit.hit(
        userId,
        key,
        maxRequests,
        windowSeconds,
      );
      expect(result2.allowed).toBe(true);

      const result3 = await rateLimit.hit(
        userId,
        key,
        maxRequests,
        windowSeconds,
      );
      expect(result3.allowed).toBe(true);

      // Verify count is correct
      const record = await prisma.rateLimit.findUnique({
        where: { userId_key: { userId, key } },
      });
      expect(record!.count).toBe(3);
    });

    it("should deny requests over limit", async () => {
      const maxRequests = 2;
      const windowSeconds = 60;

      await rateLimit.hit(userId, key, maxRequests, windowSeconds);
      await rateLimit.hit(userId, key, maxRequests, windowSeconds);

      const result = await rateLimit.hit(
        userId,
        key,
        maxRequests,
        windowSeconds,
      );

      expect(result.allowed).toBe(false);
      expect(result.retryAfterSeconds).toBeGreaterThan(0);
      expect(result.retryAfterSeconds).toBeLessThanOrEqual(windowSeconds);
    });

    it("should reset after window expires", async () => {
      const maxRequests = 2;
      const windowSeconds = 1; // 1 second window

      // Use up the limit
      await rateLimit.hit(userId, key, maxRequests, windowSeconds);
      await rateLimit.hit(userId, key, maxRequests, windowSeconds);

      // Should be denied
      const deniedResult = await rateLimit.hit(
        userId,
        key,
        maxRequests,
        windowSeconds,
      );
      expect(deniedResult.allowed).toBe(false);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Should be allowed again
      const allowedResult = await rateLimit.hit(
        userId,
        key,
        maxRequests,
        windowSeconds,
      );
      expect(allowedResult.allowed).toBe(true);

      // Verify count was reset
      const record = await prisma.rateLimit.findUnique({
        where: { userId_key: { userId, key } },
      });
      expect(record!.count).toBe(1);
    });

    it("should calculate correct retry after seconds", async () => {
      const maxRequests = 1;
      const windowSeconds = 60;

      // First request
      await rateLimit.hit(userId, key, maxRequests, windowSeconds);

      // Second request should be denied
      const result = await rateLimit.hit(
        userId,
        key,
        maxRequests,
        windowSeconds,
      );

      expect(result.allowed).toBe(false);
      expect(result.retryAfterSeconds).toBeGreaterThan(55); // Should be close to 60
      expect(result.retryAfterSeconds).toBeLessThanOrEqual(60);
    });

    it("should handle different keys independently", async () => {
      const maxRequests = 1;
      const windowSeconds = 60;
      const key1 = "sync-key-1";
      const key2 = "sync-key-2";

      // Use up limit for key1
      await rateLimit.hit(userId, key1, maxRequests, windowSeconds);
      const result1 = await rateLimit.hit(
        userId,
        key1,
        maxRequests,
        windowSeconds,
      );
      expect(result1.allowed).toBe(false);

      // key2 should still be allowed
      const result2 = await rateLimit.hit(
        userId,
        key2,
        maxRequests,
        windowSeconds,
      );
      expect(result2.allowed).toBe(true);
    });

    it("should handle different users independently", async () => {
      const maxRequests = 1;
      const windowSeconds = 60;
      const user1 = await createTestUser();
      const user2 = await createTestUser();

      // Use up limit for user1
      await rateLimit.hit(user1.id, key, maxRequests, windowSeconds);
      const result1 = await rateLimit.hit(
        user1.id,
        key,
        maxRequests,
        windowSeconds,
      );
      expect(result1.allowed).toBe(false);

      // user2 should still be allowed
      const result2 = await rateLimit.hit(
        user2.id,
        key,
        maxRequests,
        windowSeconds,
      );
      expect(result2.allowed).toBe(true);
    });

    it("should handle concurrent requests atomically", async () => {
      const maxRequests = 3;
      const windowSeconds = 60;

      // Make multiple concurrent requests
      const results = await Promise.all([
        rateLimit.hit(userId, key, maxRequests, windowSeconds),
        rateLimit.hit(userId, key, maxRequests, windowSeconds),
        rateLimit.hit(userId, key, maxRequests, windowSeconds),
        rateLimit.hit(userId, key, maxRequests, windowSeconds),
        rateLimit.hit(userId, key, maxRequests, windowSeconds),
      ]);

      // First 3 should be allowed, last 2 should be denied
      const allowedCount = results.filter((r) => r.allowed).length;
      const deniedCount = results.filter((r) => !r.allowed).length;

      expect(allowedCount).toBe(3);
      expect(deniedCount).toBe(2);

      // Verify final count in database
      const record = await prisma.rateLimit.findUnique({
        where: { userId_key: { userId, key } },
      });
      expect(record!.count).toBe(5);
    });
  });
});
