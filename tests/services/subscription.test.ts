import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/db";
import {
  isUserPremium,
  canAccessFeature,
  getRateLimitForUser,
  getSyncHistoryLimit,
  getUserSubscriptionInfo,
  updateUserSubscription,
  getUserByStripeCustomerId,
  getUserByStripeSubscriptionId,
} from "@/services/subscription";
import { createTestUser } from "../factories/db-factories";

describe("Subscription Service", () => {
  describe("isUserPremium", () => {
    it("should return true for active premium users", async () => {
      const user = await createTestUser({
        subscriptionTier: "premium",
        subscriptionStatus: "active",
        subscriptionCurrentPeriodEnd: new Date(Date.now() + 30 * 86400000), // 30 days from now
      });

      const result = await isUserPremium(user.id);
      expect(result).toBe(true);
    });

    it("should return true for trialing premium users", async () => {
      const user = await createTestUser({
        subscriptionTier: "premium",
        subscriptionStatus: "trialing",
        subscriptionCurrentPeriodEnd: new Date(Date.now() + 14 * 86400000), // 14 days from now
      });

      const result = await isUserPremium(user.id);
      expect(result).toBe(true);
    });

    it("should return false for free tier users", async () => {
      const user = await createTestUser({
        subscriptionTier: "free",
        subscriptionStatus: "free",
      });

      const result = await isUserPremium(user.id);
      expect(result).toBe(false);
    });

    it("should return false for canceled premium users", async () => {
      const user = await createTestUser({
        subscriptionTier: "premium",
        subscriptionStatus: "canceled",
        subscriptionCurrentPeriodEnd: new Date(Date.now() - 1000), // Expired
      });

      const result = await isUserPremium(user.id);
      expect(result).toBe(false);
    });

    it("should return false for past_due premium users", async () => {
      const user = await createTestUser({
        subscriptionTier: "premium",
        subscriptionStatus: "past_due",
        subscriptionCurrentPeriodEnd: new Date(Date.now() + 30 * 86400000),
      });

      const result = await isUserPremium(user.id);
      expect(result).toBe(false);
    });

    it("should return false for expired premium users", async () => {
      const user = await createTestUser({
        subscriptionTier: "premium",
        subscriptionStatus: "active",
        subscriptionCurrentPeriodEnd: new Date(Date.now() - 86400000), // Yesterday
      });

      const result = await isUserPremium(user.id);
      expect(result).toBe(false);
    });

    it("should return true for grandfathered users without period end", async () => {
      const user = await createTestUser({
        subscriptionTier: "premium",
        subscriptionStatus: "active",
        subscriptionCurrentPeriodEnd: null, // Grandfathered
      });

      const result = await isUserPremium(user.id);
      expect(result).toBe(true);
    });

    it("should return false for non-existent user", async () => {
      const result = await isUserPremium("non-existent-user-id");
      expect(result).toBe(false);
    });
  });

  describe("canAccessFeature", () => {
    it("should allow premium users to access all premium features", async () => {
      const user = await createTestUser({
        subscriptionTier: "premium",
        subscriptionStatus: "active",
        subscriptionCurrentPeriodEnd: new Date(Date.now() + 30 * 86400000),
      });

      const features = [
        "automatic_sync",
        "api_access",
        "unlimited_syncs",
        "extended_history",
        "custom_split_ratio",
        "custom_payee_name",
      ] as const;

      for (const feature of features) {
        const result = await canAccessFeature(user.id, feature);
        expect(result).toBe(true);
      }
    });

    it("should deny free users access to premium features", async () => {
      const user = await createTestUser({
        subscriptionTier: "free",
        subscriptionStatus: "free",
      });

      const features = [
        "automatic_sync",
        "api_access",
        "unlimited_syncs",
        "extended_history",
        "custom_split_ratio",
        "custom_payee_name",
      ] as const;

      for (const feature of features) {
        const result = await canAccessFeature(user.id, feature);
        expect(result).toBe(false);
      }
    });
  });

  describe("getRateLimitForUser", () => {
    it("should return high limits for premium users", async () => {
      const user = await createTestUser({
        subscriptionTier: "premium",
        subscriptionStatus: "active",
        subscriptionCurrentPeriodEnd: new Date(Date.now() + 30 * 86400000),
      });

      const result = await getRateLimitForUser(user.id);
      expect(result.hourly).toBeGreaterThan(1000);
      expect(result.daily).toBeGreaterThan(1000);
    });

    it("should return 2/hour and 6/day for free users", async () => {
      const user = await createTestUser({
        subscriptionTier: "free",
        subscriptionStatus: "free",
      });

      const result = await getRateLimitForUser(user.id);
      expect(result.hourly).toBe(2);
      expect(result.daily).toBe(6);
    });
  });

  describe("getSyncHistoryLimit", () => {
    it("should return null (unlimited) for premium users", async () => {
      const user = await createTestUser({
        subscriptionTier: "premium",
        subscriptionStatus: "active",
        subscriptionCurrentPeriodEnd: new Date(Date.now() + 30 * 86400000),
      });

      const result = await getSyncHistoryLimit(user.id);
      expect(result).toBeNull();
    });

    it("should return 7 days for free users", async () => {
      const user = await createTestUser({
        subscriptionTier: "free",
        subscriptionStatus: "free",
      });

      const result = await getSyncHistoryLimit(user.id);
      expect(result).toBe(7);
    });
  });

  describe("getUserSubscriptionInfo", () => {
    it("should return subscription info for a user", async () => {
      const periodEnd = new Date(Date.now() + 30 * 86400000);
      const user = await createTestUser({
        subscriptionTier: "premium",
        subscriptionStatus: "active",
        subscriptionCurrentPeriodEnd: periodEnd,
        subscriptionCanceledAt: null,
      });

      const result = await getUserSubscriptionInfo(user.id);
      expect(result.tier).toBe("premium");
      expect(result.status).toBe("active");
      expect(result.currentPeriodEnd?.getTime()).toBe(periodEnd.getTime());
      expect(result.canceledAt).toBeNull();
    });

    it("should throw error for non-existent user", async () => {
      await expect(
        getUserSubscriptionInfo("non-existent-user-id"),
      ).rejects.toThrow("User not found");
    });
  });

  describe("updateUserSubscription", () => {
    it("should update user subscription fields", async () => {
      const user = await createTestUser({
        subscriptionTier: "free",
        subscriptionStatus: "free",
      });

      const periodEnd = new Date(Date.now() + 30 * 86400000);
      const updated = await updateUserSubscription(user.id, {
        stripeCustomerId: "cus_test123",
        stripeSubscriptionId: "sub_test123",
        subscriptionStatus: "active",
        subscriptionTier: "premium",
        subscriptionCurrentPeriodEnd: periodEnd,
      });

      expect(updated.stripeCustomerId).toBe("cus_test123");
      expect(updated.stripeSubscriptionId).toBe("sub_test123");
      expect(updated.subscriptionStatus).toBe("active");
      expect(updated.subscriptionTier).toBe("premium");
      expect(updated.subscriptionCurrentPeriodEnd?.getTime()).toBe(
        periodEnd.getTime(),
      );
    });

    it("should allow partial updates", async () => {
      const user = await createTestUser({
        subscriptionTier: "premium",
        subscriptionStatus: "active",
        stripeCustomerId: "cus_existing",
      });

      const updated = await updateUserSubscription(user.id, {
        subscriptionStatus: "canceled",
        subscriptionCanceledAt: new Date(),
      });

      expect(updated.subscriptionStatus).toBe("canceled");
      expect(updated.subscriptionCanceledAt).not.toBeNull();
      expect(updated.stripeCustomerId).toBe("cus_existing"); // Unchanged
    });
  });

  describe("getUserByStripeCustomerId", () => {
    it("should find user by Stripe customer ID", async () => {
      const user = await createTestUser({
        stripeCustomerId: "cus_test456",
      });

      const found = await getUserByStripeCustomerId("cus_test456");
      expect(found?.id).toBe(user.id);
    });

    it("should return null for non-existent customer ID", async () => {
      const found = await getUserByStripeCustomerId("cus_nonexistent");
      expect(found).toBeNull();
    });
  });

  describe("getUserByStripeSubscriptionId", () => {
    it("should find user by Stripe subscription ID", async () => {
      const user = await createTestUser({
        stripeSubscriptionId: "sub_test789",
      });

      const found = await getUserByStripeSubscriptionId("sub_test789");
      expect(found?.id).toBe(user.id);
    });

    it("should return null for non-existent subscription ID", async () => {
      const found = await getUserByStripeSubscriptionId("sub_nonexistent");
      expect(found).toBeNull();
    });
  });
});
