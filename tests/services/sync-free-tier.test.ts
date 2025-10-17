import { describe, it, expect, beforeEach } from "vitest";
import { syncAllUsers } from "@/services/sync";
import { prisma } from "../setup";
import { createFullyConfiguredUser } from "../factories/db-factories";
import { server } from "../setup";
import { handlers } from "../mocks/handlers";

describe("Sync Service - Free Tier", () => {
  beforeEach(() => {
    server.use(...handlers);
  });

  describe("syncAllUsers - Free Tier Exclusion", () => {
    it("should not include free tier users in automatic sync", async () => {
      // Create a free tier user
      await createFullyConfiguredUser({
        user: {
          subscriptionTier: "free",
          subscriptionStatus: "free",
        },
      });

      // Create a premium user
      await createFullyConfiguredUser({
        user: {
          subscriptionTier: "premium",
          subscriptionStatus: "active",
        },
      });

      const result = await syncAllUsers();

      // Should only sync 1 user (the premium one)
      expect(result.totalUsers).toBe(1);
      expect(Object.keys(result.results).length).toBe(1);
    });

    it("should not include canceled premium users in automatic sync", async () => {
      // Create a canceled premium user
      await createFullyConfiguredUser({
        user: {
          subscriptionTier: "premium",
          subscriptionStatus: "canceled",
          subscriptionCanceledAt: new Date(),
        },
      });

      const result = await syncAllUsers();

      // Should sync 0 users
      expect(result.totalUsers).toBe(0);
      expect(Object.keys(result.results).length).toBe(0);
    });

    it("should not include past_due premium users in automatic sync", async () => {
      await createFullyConfiguredUser({
        user: {
          subscriptionTier: "premium",
          subscriptionStatus: "past_due",
        },
      });

      const result = await syncAllUsers();

      expect(result.totalUsers).toBe(0);
    });

    it("should include trialing premium users in automatic sync", async () => {
      await createFullyConfiguredUser({
        user: {
          subscriptionTier: "premium",
          subscriptionStatus: "trialing",
        },
      });

      const result = await syncAllUsers();

      expect(result.totalUsers).toBe(1);
    });

    it("should only sync active and trialing premium users", async () => {
      // Free user - should not sync
      await createFullyConfiguredUser({
        user: {
          email: "free@test.com",
          subscriptionTier: "free",
          subscriptionStatus: "free",
        },
      });

      // Active premium - should sync
      await createFullyConfiguredUser({
        user: {
          email: "active@test.com",
          subscriptionTier: "premium",
          subscriptionStatus: "active",
        },
      });

      // Trialing premium - should sync
      await createFullyConfiguredUser({
        user: {
          email: "trialing@test.com",
          subscriptionTier: "premium",
          subscriptionStatus: "trialing",
        },
      });

      // Canceled premium - should not sync
      await createFullyConfiguredUser({
        user: {
          email: "canceled@test.com",
          subscriptionTier: "premium",
          subscriptionStatus: "canceled",
        },
      });

      // Past due premium - should not sync
      await createFullyConfiguredUser({
        user: {
          email: "pastdue@test.com",
          subscriptionTier: "premium",
          subscriptionStatus: "past_due",
        },
      });

      const result = await syncAllUsers();

      // Should only sync 2 users (active and trialing)
      expect(result.totalUsers).toBe(2);
    });

    it("should handle mixed free and premium users correctly", async () => {
      const freeUser = await createFullyConfiguredUser({
        user: {
          email: "free@test.com",
          subscriptionTier: "free",
          subscriptionStatus: "free",
        },
      });

      const premiumUser = await createFullyConfiguredUser({
        user: {
          email: "premium@test.com",
          subscriptionTier: "premium",
          subscriptionStatus: "active",
        },
      });

      const result = await syncAllUsers();

      // Only premium user should be synced
      expect(result.totalUsers).toBe(1);
      expect(result.results[premiumUser.user.id]).toBeDefined();
      expect(result.results[freeUser.user.id]).toBeUndefined();
    });
  });

  describe("Free Tier - Manual Sync Still Allowed", () => {
    it("should allow free users to trigger manual syncs (subject to rate limits)", async () => {
      // This is tested in the actions/sync tests with rate limiting
      // Free users CAN manually sync, just with rate limits
      const freeUser = await createFullyConfiguredUser({
        user: {
          subscriptionTier: "free",
          subscriptionStatus: "free",
        },
      });

      // Verify the user was created correctly
      const user = await prisma.user.findUnique({
        where: { id: freeUser.user.id },
      });

      expect(user?.subscriptionTier).toBe("free");
      expect(user?.subscriptionStatus).toBe("free");
    });
  });

  describe("Free Tier After Downgrade", () => {
    it("should exclude users who downgraded from premium to free", async () => {
      await createFullyConfiguredUser({
        user: {
          email: "downgraded@test.com",
          subscriptionTier: "free",
          subscriptionStatus: "free",
          subscriptionCanceledAt: new Date(),
          stripeSubscriptionId: "sub_old_premium",
        },
      });

      const result = await syncAllUsers();

      // Should not include downgraded users in automatic sync
      expect(result.totalUsers).toBe(0);
    });
  });
});
