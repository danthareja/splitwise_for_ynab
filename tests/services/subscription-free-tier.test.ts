import { describe, it, expect, beforeEach } from "vitest";
import { createTestUser } from "../factories/db-factories";
import {
  isUserPremium,
  canAccessFeature,
  getRateLimitForUser,
  getSyncHistoryLimit,
} from "@/services/subscription";

describe("Subscription Service - Free Tier", () => {
  describe("isUserPremium", () => {
    it("should return false for free tier users", async () => {
      const user = await createTestUser({
        subscriptionTier: "free",
        subscriptionStatus: "free",
      });

      const isPremium = await isUserPremium(user.id);
      expect(isPremium).toBe(false);
    });

    it("should return false for users with premium tier but inactive status", async () => {
      const user = await createTestUser({
        subscriptionTier: "premium",
        subscriptionStatus: "canceled",
      });

      const isPremium = await isUserPremium(user.id);
      expect(isPremium).toBe(false);
    });

    it("should return false for users with premium tier but past_due status", async () => {
      const user = await createTestUser({
        subscriptionTier: "premium",
        subscriptionStatus: "past_due",
      });

      const isPremium = await isUserPremium(user.id);
      expect(isPremium).toBe(false);
    });

    it("should return false for expired premium users", async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // Yesterday

      const user = await createTestUser({
        subscriptionTier: "premium",
        subscriptionStatus: "active",
        subscriptionCurrentPeriodEnd: pastDate,
      });

      const isPremium = await isUserPremium(user.id);
      expect(isPremium).toBe(false);
    });
  });

  describe("canAccessFeature - Free Tier", () => {
    let freeUser: Awaited<ReturnType<typeof createTestUser>>;

    beforeEach(async () => {
      freeUser = await createTestUser({
        subscriptionTier: "free",
        subscriptionStatus: "free",
      });
    });

    it("should deny automatic_sync for free users", async () => {
      const canAccess = await canAccessFeature(freeUser.id, "automatic_sync");
      expect(canAccess).toBe(false);
    });

    it("should deny unlimited_syncs for free users", async () => {
      const canAccess = await canAccessFeature(freeUser.id, "unlimited_syncs");
      expect(canAccess).toBe(false);
    });

    it("should deny api_access for free users", async () => {
      const canAccess = await canAccessFeature(freeUser.id, "api_access");
      expect(canAccess).toBe(false);
    });

    it("should deny extended_history for free users", async () => {
      const canAccess = await canAccessFeature(freeUser.id, "extended_history");
      expect(canAccess).toBe(false);
    });

    it("should deny custom_split_ratio for free users", async () => {
      const canAccess = await canAccessFeature(
        freeUser.id,
        "custom_split_ratio",
      );
      expect(canAccess).toBe(false);
    });

    it("should deny custom_payee_name for free users", async () => {
      const canAccess = await canAccessFeature(
        freeUser.id,
        "custom_payee_name",
      );
      expect(canAccess).toBe(false);
    });
  });

  describe("getRateLimitForUser - Free Tier", () => {
    it("should return 2/hour and 6/day for free tier users", async () => {
      const user = await createTestUser({
        subscriptionTier: "free",
        subscriptionStatus: "free",
      });

      const limits = await getRateLimitForUser(user.id);

      expect(limits.hourly).toBe(2);
      expect(limits.daily).toBe(6);
    });

    it("should return free tier limits for users without subscription fields", async () => {
      const user = await createTestUser({
        subscriptionTier: "free",
        subscriptionStatus: "free",
      });

      const limits = await getRateLimitForUser(user.id);

      expect(limits.hourly).toBe(2);
      expect(limits.daily).toBe(6);
    });
  });

  describe("getSyncHistoryLimit - Free Tier", () => {
    it("should return 7 days limit for free tier users", async () => {
      const user = await createTestUser({
        subscriptionTier: "free",
        subscriptionStatus: "free",
      });

      const limit = await getSyncHistoryLimit(user.id);

      expect(limit).toBe(7);
    });
  });

  describe("Free tier after premium cancellation", () => {
    it("should revert to free tier limits after premium cancellation", async () => {
      const user = await createTestUser({
        subscriptionTier: "free",
        subscriptionStatus: "canceled",
        subscriptionCanceledAt: new Date(),
      });

      const isPremium = await isUserPremium(user.id);
      expect(isPremium).toBe(false);

      const limits = await getRateLimitForUser(user.id);
      expect(limits.hourly).toBe(2);
      expect(limits.daily).toBe(6);

      const historyLimit = await getSyncHistoryLimit(user.id);
      expect(historyLimit).toBe(7);

      const canUseApi = await canAccessFeature(user.id, "api_access");
      expect(canUseApi).toBe(false);
    });

    it("should revert to free tier after premium period expires", async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const user = await createTestUser({
        subscriptionTier: "premium",
        subscriptionStatus: "active",
        subscriptionCurrentPeriodEnd: yesterday,
      });

      const isPremium = await isUserPremium(user.id);
      expect(isPremium).toBe(false);

      const canUseCustomSplit = await canAccessFeature(
        user.id,
        "custom_split_ratio",
      );
      expect(canUseCustomSplit).toBe(false);
    });
  });

  describe("Free tier with past_due status", () => {
    it("should treat past_due subscriptions as non-premium", async () => {
      const user = await createTestUser({
        subscriptionTier: "premium",
        subscriptionStatus: "past_due",
      });

      const isPremium = await isUserPremium(user.id);
      expect(isPremium).toBe(false);

      const canAutoSync = await canAccessFeature(user.id, "automatic_sync");
      expect(canAutoSync).toBe(false);

      const limits = await getRateLimitForUser(user.id);
      expect(limits.hourly).toBe(2);
      expect(limits.daily).toBe(6);
    });
  });
});
