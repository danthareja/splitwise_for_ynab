import { describe, it, expect, vi, beforeEach } from "vitest";
import { saveSplitwiseSettings } from "@/app/actions/splitwise";
import { prisma } from "../setup";
import { createFullyConfiguredUser } from "../factories/db-factories";

// Mock auth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { auth } from "@/auth";

describe("Splitwise Actions - Free Tier Feature Gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("saveSplitwiseSettings - Custom Split Ratio", () => {
    it("should block free users from using custom split ratios", async () => {
      const userData = await createFullyConfiguredUser({
        user: { subscriptionTier: "free", subscriptionStatus: "free" },
      });

      vi.mocked(auth).mockResolvedValue({
        user: {
          id: userData.user.id,
          subscriptionTier: "free",
          subscriptionStatus: "free",
        },
      } as any);

      const formData = new FormData();
      formData.append("groupId", userData.splitwiseSettings.groupId!);
      formData.append("groupName", userData.splitwiseSettings.groupName!);
      formData.append("currencyCode", userData.splitwiseSettings.currencyCode!);
      formData.append("emoji", "✅");
      formData.append("splitRatio", "2:1"); // Custom ratio (not 1:1)
      formData.append("useDescriptionAsPayee", "false");
      formData.append("customPayeeName", "");

      const result = await saveSplitwiseSettings(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Custom split ratios");
      expect(result.error).toContain("Premium feature");
      expect(result.isPremiumFeature).toBe(true);
    });

    it("should allow free users to use 1:1 split ratio", async () => {
      const userData = await createFullyConfiguredUser({
        user: { subscriptionTier: "free", subscriptionStatus: "free" },
      });

      vi.mocked(auth).mockResolvedValue({
        user: {
          id: userData.user.id,
          subscriptionTier: "free",
          subscriptionStatus: "free",
        },
      } as any);

      const formData = new FormData();
      formData.append("groupId", userData.splitwiseSettings.groupId!);
      formData.append("groupName", userData.splitwiseSettings.groupName!);
      formData.append("currencyCode", userData.splitwiseSettings.currencyCode!);
      formData.append("emoji", "✅");
      formData.append("splitRatio", "1:1"); // Default ratio
      formData.append("useDescriptionAsPayee", "false");
      formData.append("customPayeeName", "");

      const result = await saveSplitwiseSettings(formData);

      // Should succeed because 1:1 is allowed for free users
      expect(result.success).toBe(true);
    });

    it("should block free users with 3:2 split ratio", async () => {
      const userData = await createFullyConfiguredUser({
        user: { subscriptionTier: "free", subscriptionStatus: "free" },
      });

      vi.mocked(auth).mockResolvedValue({
        user: {
          id: userData.user.id,
          subscriptionTier: "free",
          subscriptionStatus: "free",
        },
      } as any);

      const formData = new FormData();
      formData.append("groupId", userData.splitwiseSettings.groupId!);
      formData.append("groupName", userData.splitwiseSettings.groupName!);
      formData.append("currencyCode", userData.splitwiseSettings.currencyCode!);
      formData.append("emoji", "✅");
      formData.append("splitRatio", "3:2");
      formData.append("useDescriptionAsPayee", "false");
      formData.append("customPayeeName", "");

      const result = await saveSplitwiseSettings(formData);

      expect(result.success).toBe(false);
      expect(result.isPremiumFeature).toBe(true);
    });
  });

  describe("saveSplitwiseSettings - Custom Payee Names", () => {
    it("should block free users from using custom payee names", async () => {
      const userData = await createFullyConfiguredUser({
        user: { subscriptionTier: "free", subscriptionStatus: "free" },
      });

      vi.mocked(auth).mockResolvedValue({
        user: {
          id: userData.user.id,
          subscriptionTier: "free",
          subscriptionStatus: "free",
        },
      } as any);

      const formData = new FormData();
      formData.append("groupId", userData.splitwiseSettings.groupId!);
      formData.append("groupName", userData.splitwiseSettings.groupName!);
      formData.append("currencyCode", userData.splitwiseSettings.currencyCode!);
      formData.append("emoji", "✅");
      formData.append("splitRatio", "1:1");
      formData.append("useDescriptionAsPayee", "false");
      formData.append("customPayeeName", "My Custom Payee");

      const result = await saveSplitwiseSettings(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Custom payee names");
      expect(result.error).toContain("Premium feature");
      expect(result.isPremiumFeature).toBe(true);
    });

    it("should block free users from using description as payee", async () => {
      const userData = await createFullyConfiguredUser({
        user: { subscriptionTier: "free", subscriptionStatus: "free" },
      });

      vi.mocked(auth).mockResolvedValue({
        user: {
          id: userData.user.id,
          subscriptionTier: "free",
          subscriptionStatus: "free",
        },
      } as any);

      const formData = new FormData();
      formData.append("groupId", userData.splitwiseSettings.groupId!);
      formData.append("groupName", userData.splitwiseSettings.groupName!);
      formData.append("currencyCode", userData.splitwiseSettings.currencyCode!);
      formData.append("emoji", "✅");
      formData.append("splitRatio", "1:1");
      formData.append("useDescriptionAsPayee", "true");
      formData.append("customPayeeName", "");

      const result = await saveSplitwiseSettings(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Premium feature");
      expect(result.isPremiumFeature).toBe(true);
    });

    it("should allow free users with no custom payee settings", async () => {
      const userData = await createFullyConfiguredUser({
        user: { subscriptionTier: "free", subscriptionStatus: "free" },
      });

      vi.mocked(auth).mockResolvedValue({
        user: {
          id: userData.user.id,
          subscriptionTier: "free",
          subscriptionStatus: "free",
        },
      } as any);

      const formData = new FormData();
      formData.append("groupId", userData.splitwiseSettings.groupId!);
      formData.append("groupName", userData.splitwiseSettings.groupName!);
      formData.append("currencyCode", userData.splitwiseSettings.currencyCode!);
      formData.append("emoji", "✅");
      formData.append("splitRatio", "1:1");
      formData.append("useDescriptionAsPayee", "false");
      formData.append("customPayeeName", "");

      const result = await saveSplitwiseSettings(formData);

      expect(result.success).toBe(true);
    });
  });

  describe("saveSplitwiseSettings - Multiple Premium Features", () => {
    it("should block free users trying to use both custom ratio and custom payee", async () => {
      const userData = await createFullyConfiguredUser({
        user: { subscriptionTier: "free", subscriptionStatus: "free" },
      });

      vi.mocked(auth).mockResolvedValue({
        user: {
          id: userData.user.id,
          subscriptionTier: "free",
          subscriptionStatus: "free",
        },
      } as any);

      const formData = new FormData();
      formData.append("groupId", userData.splitwiseSettings.groupId!);
      formData.append("groupName", userData.splitwiseSettings.groupName!);
      formData.append("currencyCode", userData.splitwiseSettings.currencyCode!);
      formData.append("emoji", "✅");
      formData.append("splitRatio", "60:40");
      formData.append("useDescriptionAsPayee", "true");
      formData.append("customPayeeName", "");

      const result = await saveSplitwiseSettings(formData);

      // Should fail on the first check (split ratio)
      expect(result.success).toBe(false);
      expect(result.isPremiumFeature).toBe(true);
    });
  });
});
