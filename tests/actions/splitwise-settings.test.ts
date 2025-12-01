import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "../setup";
import {
  createTestUser,
  createTestSplitwiseSettings,
  createTestAccount,
} from "../factories/db-factories";
import { nanoid } from "nanoid";

// Mock auth to return our test user
const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock revalidatePath (Next.js server action)
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Import after mocking
import { saveSplitwiseSettings } from "@/app/actions/splitwise";

/**
 * Tests for Splitwise Settings - QA.md Section 3.5
 * These tests verify the actual business logic in saveSplitwiseSettings
 */

describe("actions/splitwise - saveSplitwiseSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("3.5 Emoji conflict with partner", () => {
    it("should return error when partner uses same emoji", async () => {
      const groupId = `group-${nanoid(10)}`;

      // Create primary user with ✅ emoji
      const primary = await createTestUser({
        id: `primary-${nanoid(10)}`,
        persona: "dual",
        onboardingComplete: true,
      });

      await createTestSplitwiseSettings({
        userId: primary.id,
        groupId,
        emoji: "✅",
        currencyCode: "USD",
      });

      // Create secondary user linked to primary
      const secondary = await createTestUser({
        id: `secondary-${nanoid(10)}`,
        persona: "dual",
        primaryUserId: primary.id,
        onboardingComplete: true,
      });

      await createTestSplitwiseSettings({
        userId: secondary.id,
        groupId,
        emoji: "🔄", // Different initially
        currencyCode: "USD",
      });

      // Mock auth to return secondary user
      mockAuth.mockResolvedValue({ user: { id: secondary.id } });

      // Try to save with conflicting emoji
      const formData = new FormData();
      formData.set("groupId", groupId);
      formData.set("groupName", "Test Group");
      formData.set("currencyCode", "USD");
      formData.set("emoji", "✅"); // Same as primary!
      formData.set("splitRatio", "1:1");

      const result = await saveSplitwiseSettings(formData);

      expect(result.success).toBe(false);
      expect(result.isEmojiConflict).toBe(true);
      expect(result.error).toContain("conflict");
    });

    it("should allow different emoji from partner", async () => {
      const groupId = `group-${nanoid(10)}`;

      // Create primary user
      const primary = await createTestUser({
        id: `primary-${nanoid(10)}`,
        persona: "dual",
        onboardingComplete: true,
      });

      await createTestSplitwiseSettings({
        userId: primary.id,
        groupId,
        emoji: "✅",
        currencyCode: "USD",
      });

      // Create secondary user
      const secondary = await createTestUser({
        id: `secondary-${nanoid(10)}`,
        persona: "dual",
        primaryUserId: primary.id,
        onboardingComplete: true,
      });

      // Mock auth to return secondary user
      mockAuth.mockResolvedValue({ user: { id: secondary.id } });

      // Save with different emoji
      const formData = new FormData();
      formData.set("groupId", groupId);
      formData.set("groupName", "Test Group");
      formData.set("currencyCode", "USD");
      formData.set("emoji", "🔄"); // Different from primary
      formData.set("splitRatio", "1:1");

      const result = await saveSplitwiseSettings(formData);

      expect(result.success).toBe(true);
    });
  });

  describe("3.5 Split ratio change syncs to partner (reversed)", () => {
    it("should reverse split ratio when syncing to partner", async () => {
      const groupId = `group-${nanoid(10)}`;

      // Create primary user
      const primary = await createTestUser({
        id: `primary-${nanoid(10)}`,
        persona: "dual",
        onboardingComplete: true,
      });

      await createTestSplitwiseSettings({
        userId: primary.id,
        groupId,
        emoji: "✅",
        currencyCode: "USD",
        defaultSplitRatio: "1:1",
      });

      // Create secondary user
      const secondary = await createTestUser({
        id: `secondary-${nanoid(10)}`,
        persona: "dual",
        primaryUserId: primary.id,
        onboardingComplete: true,
      });

      await createTestSplitwiseSettings({
        userId: secondary.id,
        groupId,
        emoji: "🔄",
        currencyCode: "USD",
        defaultSplitRatio: "1:1",
      });

      // Mock auth to return primary user
      mockAuth.mockResolvedValue({ user: { id: primary.id } });

      // Primary changes split ratio to 2:1
      const formData = new FormData();
      formData.set("groupId", groupId);
      formData.set("groupName", "Test Group");
      formData.set("currencyCode", "USD");
      formData.set("emoji", "✅");
      formData.set("splitRatio", "2:1");

      const result = await saveSplitwiseSettings(formData);

      expect(result.success).toBe(true);
      expect(result.splitRatioSynced).toBe(true);

      // Verify partner's ratio is reversed (1:2)
      const secondarySettings = await prisma.splitwiseSettings.findUnique({
        where: { userId: secondary.id },
      });

      expect(secondarySettings?.defaultSplitRatio).toBe("1:2");
    });
  });

  describe("3.5 Currency mismatch syncs to partner", () => {
    it("should sync currency to partner when changed", async () => {
      const groupId = `group-${nanoid(10)}`;

      // Create primary user with USD
      const primary = await createTestUser({
        id: `primary-${nanoid(10)}`,
        persona: "dual",
        onboardingComplete: true,
      });

      await createTestSplitwiseSettings({
        userId: primary.id,
        groupId,
        emoji: "✅",
        currencyCode: "USD",
      });

      // Create secondary user with USD
      const secondary = await createTestUser({
        id: `secondary-${nanoid(10)}`,
        persona: "dual",
        primaryUserId: primary.id,
        onboardingComplete: true,
      });

      await createTestSplitwiseSettings({
        userId: secondary.id,
        groupId,
        emoji: "🔄",
        currencyCode: "USD",
      });

      // Mock auth to return primary user
      mockAuth.mockResolvedValue({ user: { id: primary.id } });

      // Primary changes currency to EUR
      const formData = new FormData();
      formData.set("groupId", groupId);
      formData.set("groupName", "Test Group");
      formData.set("currencyCode", "EUR");
      formData.set("emoji", "✅");
      formData.set("splitRatio", "1:1");

      const result = await saveSplitwiseSettings(formData);

      expect(result.success).toBe(true);
      expect(result.currencySynced).toBe(true);

      // Verify partner's currency is also EUR
      const secondarySettings = await prisma.splitwiseSettings.findUnique({
        where: { userId: secondary.id },
      });

      expect(secondarySettings?.currencyCode).toBe("EUR");
    });
  });

  describe("3.5 Group already in use by non-partner", () => {
    it("should block group if in use by solo user", async () => {
      const groupId = `group-${nanoid(10)}`;

      // Create existing solo user using this group
      const existingUser = await createTestUser({
        id: `existing-${nanoid(10)}`,
        persona: "solo",
        onboardingComplete: true,
      });

      await createTestSplitwiseSettings({
        userId: existingUser.id,
        groupId,
        emoji: "✅",
        currencyCode: "USD",
      });

      // Create new user trying to use the same group
      const newUser = await createTestUser({
        id: `new-${nanoid(10)}`,
        persona: "solo",
        onboardingComplete: false,
      });

      // Mock auth to return new user
      mockAuth.mockResolvedValue({ user: { id: newUser.id } });

      // Try to save with conflicting group
      const formData = new FormData();
      formData.set("groupId", groupId);
      formData.set("groupName", "Test Group");
      formData.set("currencyCode", "USD");
      formData.set("emoji", "🔄");
      formData.set("splitRatio", "1:1");

      const result = await saveSplitwiseSettings(formData);

      expect(result.success).toBe(false);
      expect(result.isGroupConflict).toBe(true);
      expect(result.error?.toLowerCase()).toContain("solo");
    });

    it("should block group if in use by dual user without partnership", async () => {
      const groupId = `group-${nanoid(10)}`;

      // Create existing dual user using this group
      const existingUser = await createTestUser({
        id: `existing-${nanoid(10)}`,
        persona: "dual",
        onboardingComplete: true,
      });

      await createTestSplitwiseSettings({
        userId: existingUser.id,
        groupId,
        emoji: "✅",
        currencyCode: "USD",
      });

      // Create new user trying to use the same group (not linked as partner)
      const newUser = await createTestUser({
        id: `new-${nanoid(10)}`,
        persona: "solo",
        onboardingComplete: false,
      });

      // Mock auth to return new user
      mockAuth.mockResolvedValue({ user: { id: newUser.id } });

      // Try to save with conflicting group
      const formData = new FormData();
      formData.set("groupId", groupId);
      formData.set("groupName", "Test Group");
      formData.set("currencyCode", "USD");
      formData.set("emoji", "🔄");
      formData.set("splitRatio", "1:1");

      const result = await saveSplitwiseSettings(formData);

      expect(result.success).toBe(false);
      expect(result.isGroupConflict).toBe(true);
      expect(result.error).toContain("invite");
    });

    it("should allow group if used by linked partner", async () => {
      const groupId = `group-${nanoid(10)}`;

      // Create primary user
      const primary = await createTestUser({
        id: `primary-${nanoid(10)}`,
        persona: "dual",
        onboardingComplete: true,
      });

      await createTestSplitwiseSettings({
        userId: primary.id,
        groupId,
        emoji: "✅",
        currencyCode: "USD",
      });

      // Create secondary user linked to primary
      const secondary = await createTestUser({
        id: `secondary-${nanoid(10)}`,
        persona: "dual",
        primaryUserId: primary.id, // Linked!
        onboardingComplete: false,
      });

      // Mock auth to return secondary user
      mockAuth.mockResolvedValue({ user: { id: secondary.id } });

      // Save with same group - should be allowed
      const formData = new FormData();
      formData.set("groupId", groupId);
      formData.set("groupName", "Test Group");
      formData.set("currencyCode", "USD");
      formData.set("emoji", "🔄");
      formData.set("splitRatio", "1:1");

      const result = await saveSplitwiseSettings(formData);

      expect(result.success).toBe(true);
    });
  });
});
