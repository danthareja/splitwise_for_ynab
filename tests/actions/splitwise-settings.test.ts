import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "../setup";
import {
  createTestUser,
  createTestSplitwiseSettings,
  createTestAccount,
  createTestYnabSettings,
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

// Mock Splitwise group API for group change tests
const mockGetSplitwiseGroup = vi.fn();
vi.mock("@/services/splitwise-auth", () => ({
  getSplitwiseGroup: (...args: unknown[]) => mockGetSplitwiseGroup(...args),
  getSplitwiseGroups: vi.fn().mockResolvedValue({ success: true, groups: [] }),
  validateSplitwiseApiKey: vi.fn().mockResolvedValue({ success: true }),
}));

// Import after mocking
import {
  saveSplitwiseSettings,
  joinHousehold,
  checkSecondaryInGroup,
  linkAsSecondary,
  createPartnerInvite,
} from "@/app/actions/splitwise";

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

  describe("Primary changes Splitwise group - secondary sync", () => {
    beforeEach(() => {
      mockGetSplitwiseGroup.mockReset();
    });

    it("should sync group change to secondary when secondary is in the new group", async () => {
      const oldGroupId = `old-group-${nanoid(10)}`;
      const newGroupId = `new-group-${nanoid(10)}`;
      const secondaryEmail = `secondary-${nanoid(6)}@test.com`;

      // Create primary user with old group
      const primary = await createTestUser({
        id: `primary-${nanoid(10)}`,
        persona: "dual",
        onboardingComplete: true,
      });

      await createTestSplitwiseSettings({
        userId: primary.id,
        groupId: oldGroupId,
        groupName: "Old Group",
        emoji: "✅",
        currencyCode: "USD",
        defaultSplitRatio: "2:1",
      });

      // Create Splitwise account for primary (so they can fetch groups)
      await createTestAccount("splitwise", {
        userId: primary.id,
        providerAccountId: `sw-${nanoid(10)}`,
        access_token: "test-api-key",
      });

      // Create secondary user linked to primary with old group
      const secondary = await createTestUser({
        id: `secondary-${nanoid(10)}`,
        email: secondaryEmail,
        persona: "dual",
        primaryUserId: primary.id,
        onboardingComplete: true,
      });

      await createTestSplitwiseSettings({
        userId: secondary.id,
        groupId: oldGroupId,
        groupName: "Old Group",
        emoji: "🔄",
        currencyCode: "USD",
        defaultSplitRatio: "1:2",
      });

      // Mock the Splitwise API to return the new group with secondary as a member
      mockGetSplitwiseGroup.mockResolvedValue({
        success: true,
        group: {
          id: parseInt(newGroupId),
          name: "New Group",
          members: [
            { id: 1, email: "primary@test.com" },
            { id: 2, email: secondaryEmail }, // Secondary IS in this group
          ],
        },
      });

      // Mock auth to return primary user
      mockAuth.mockResolvedValue({ user: { id: primary.id } });

      // Primary changes to new group
      const formData = new FormData();
      formData.set("groupId", newGroupId);
      formData.set("groupName", "New Group");
      formData.set("currencyCode", "EUR"); // Also changing currency
      formData.set("emoji", "✅");
      formData.set("splitRatio", "3:1"); // Also changing split ratio

      const result = await saveSplitwiseSettings(formData);

      expect(result.success).toBe(true);
      expect(result.groupSynced).toBe(true);
      expect(result.partnerOrphaned).toBe(false);

      // Verify secondary's settings were updated
      const secondarySettings = await prisma.splitwiseSettings.findUnique({
        where: { userId: secondary.id },
      });

      expect(secondarySettings?.groupId).toBe(newGroupId);
      expect(secondarySettings?.groupName).toBe("New Group");
      expect(secondarySettings?.currencyCode).toBe("EUR");
      expect(secondarySettings?.defaultSplitRatio).toBe("1:3"); // Reversed
    });

    it("should orphan secondary when they are NOT in the new group", async () => {
      const oldGroupId = `old-group-${nanoid(10)}`;
      const newGroupId = `new-group-${nanoid(10)}`;
      const secondaryEmail = `secondary-${nanoid(6)}@test.com`;

      // Create primary user with old group
      const primary = await createTestUser({
        id: `primary-${nanoid(10)}`,
        persona: "dual",
        onboardingComplete: true,
      });

      await createTestSplitwiseSettings({
        userId: primary.id,
        groupId: oldGroupId,
        groupName: "Old Group",
        emoji: "✅",
        currencyCode: "USD",
        defaultSplitRatio: "1:1",
      });

      // Create Splitwise account for primary
      await createTestAccount("splitwise", {
        userId: primary.id,
        providerAccountId: `sw-${nanoid(10)}`,
        access_token: "test-api-key",
      });

      // Create secondary user linked to primary
      const secondary = await createTestUser({
        id: `secondary-${nanoid(10)}`,
        email: secondaryEmail,
        persona: "dual",
        primaryUserId: primary.id,
        onboardingComplete: true,
      });

      await createTestSplitwiseSettings({
        userId: secondary.id,
        groupId: oldGroupId,
        groupName: "Old Group",
        emoji: "🔄",
        currencyCode: "USD",
        defaultSplitRatio: "1:1",
      });

      // Mock the Splitwise API to return the new group WITHOUT secondary as a member
      mockGetSplitwiseGroup.mockResolvedValue({
        success: true,
        group: {
          id: parseInt(newGroupId),
          name: "New Group",
          members: [
            { id: 1, email: "primary@test.com" },
            { id: 2, email: "someone-else@test.com" }, // Secondary is NOT in this group!
          ],
        },
      });

      // Mock auth to return primary user
      mockAuth.mockResolvedValue({ user: { id: primary.id } });

      // Primary changes to new group
      const formData = new FormData();
      formData.set("groupId", newGroupId);
      formData.set("groupName", "New Group");
      formData.set("currencyCode", "USD");
      formData.set("emoji", "✅");
      formData.set("splitRatio", "1:1");

      const result = await saveSplitwiseSettings(formData);

      expect(result.success).toBe(true);
      expect(result.partnerOrphaned).toBe(true);
      expect(result.orphanedPartnerName).toBeTruthy();

      // Verify secondary's shared settings were cleared (they're orphaned)
      const secondarySettings = await prisma.splitwiseSettings.findUnique({
        where: { userId: secondary.id },
      });

      expect(secondarySettings?.groupId).toBeNull();
      expect(secondarySettings?.groupName).toBeNull();
      expect(secondarySettings?.currencyCode).toBeNull();
      expect(secondarySettings?.defaultSplitRatio).toBeNull();
      // Note: emoji is user-specific and should remain

      // Verify secondary is fully unlinked from primary (not just settings cleared)
      const secondaryUser = await prisma.user.findUnique({
        where: { id: secondary.id },
      });

      expect(secondaryUser?.primaryUserId).toBeNull(); // No longer linked
      expect(secondaryUser?.persona).toBe("solo"); // Converted to solo
      expect(secondaryUser?.onboardingComplete).toBe(false); // Needs to reconfigure
      expect(secondaryUser?.onboardingStep).toBe(3); // At Splitwise config step
    });

    it("should not sync if no secondary user exists", async () => {
      const oldGroupId = `old-group-${nanoid(10)}`;
      const newGroupId = `new-group-${nanoid(10)}`;

      // Create primary user (solo) with old group
      const primary = await createTestUser({
        id: `primary-${nanoid(10)}`,
        persona: "solo",
        onboardingComplete: true,
      });

      await createTestSplitwiseSettings({
        userId: primary.id,
        groupId: oldGroupId,
        groupName: "Old Group",
        emoji: "✅",
        currencyCode: "USD",
      });

      // Mock auth to return primary user
      mockAuth.mockResolvedValue({ user: { id: primary.id } });

      // Primary changes to new group
      const formData = new FormData();
      formData.set("groupId", newGroupId);
      formData.set("groupName", "New Group");
      formData.set("currencyCode", "USD");
      formData.set("emoji", "✅");
      formData.set("splitRatio", "1:1");

      const result = await saveSplitwiseSettings(formData);

      expect(result.success).toBe(true);
      expect(result.groupSynced).toBe(false);
      expect(result.partnerOrphaned).toBe(false);

      // The Splitwise group API should not have been called since there's no secondary
      expect(mockGetSplitwiseGroup).not.toHaveBeenCalled();
    });
  });

  describe("checkSecondaryInGroup - validates secondary membership", () => {
    beforeEach(() => {
      mockGetSplitwiseGroup.mockReset();
    });

    it("should return hasSecondary: false when primary has no secondary", async () => {
      // Create primary user without secondary
      const primary = await createTestUser({
        id: `primary-${nanoid(10)}`,
        persona: "dual",
        onboardingComplete: true,
      });

      // Mock auth to return primary user
      mockAuth.mockResolvedValue({ user: { id: primary.id } });

      const result = await checkSecondaryInGroup("some-group-id");

      expect(result.success).toBe(true);
      expect(result.hasSecondary).toBe(false);
    });

    it("should return secondaryInGroup: true when secondary email is in group", async () => {
      const groupId = `group-${nanoid(10)}`;
      const secondaryEmail = `secondary-${nanoid(6)}@test.com`;

      // Create primary user
      const primary = await createTestUser({
        id: `primary-${nanoid(10)}`,
        persona: "dual",
        onboardingComplete: true,
      });

      // Create Splitwise account for primary
      await createTestAccount("splitwise", {
        userId: primary.id,
        providerAccountId: `sw-${nanoid(10)}`,
        access_token: "test-api-key",
      });

      // Create secondary user
      const secondary = await createTestUser({
        id: `secondary-${nanoid(10)}`,
        email: secondaryEmail,
        persona: "dual",
        primaryUserId: primary.id,
        onboardingComplete: true,
      });

      // Mock the Splitwise API
      mockGetSplitwiseGroup.mockResolvedValue({
        success: true,
        group: {
          id: parseInt(groupId),
          name: "Test Group",
          members: [
            { id: 1, email: "primary@test.com" },
            { id: 2, email: secondaryEmail }, // Secondary IS in this group
          ],
        },
      });

      // Mock auth to return primary user
      mockAuth.mockResolvedValue({ user: { id: primary.id } });

      const result = await checkSecondaryInGroup(groupId);

      expect(result.success).toBe(true);
      expect(result.hasSecondary).toBe(true);
      expect(result.secondaryInGroup).toBe(true);
      expect(result.secondaryName).toBeTruthy();
    });

    it("should return secondaryInGroup: false when secondary email is NOT in group", async () => {
      const groupId = `group-${nanoid(10)}`;
      const secondaryEmail = `secondary-${nanoid(6)}@test.com`;

      // Create primary user
      const primary = await createTestUser({
        id: `primary-${nanoid(10)}`,
        persona: "dual",
        onboardingComplete: true,
      });

      // Create Splitwise account for primary
      await createTestAccount("splitwise", {
        userId: primary.id,
        providerAccountId: `sw-${nanoid(10)}`,
        access_token: "test-api-key",
      });

      // Create secondary user
      const secondary = await createTestUser({
        id: `secondary-${nanoid(10)}`,
        email: secondaryEmail,
        persona: "dual",
        primaryUserId: primary.id,
        onboardingComplete: true,
      });

      // Mock the Splitwise API - secondary is NOT in the group
      mockGetSplitwiseGroup.mockResolvedValue({
        success: true,
        group: {
          id: parseInt(groupId),
          name: "Test Group",
          members: [
            { id: 1, email: "primary@test.com" },
            { id: 2, email: "different-person@test.com" }, // Not the secondary!
          ],
        },
      });

      // Mock auth to return primary user
      mockAuth.mockResolvedValue({ user: { id: primary.id } });

      const result = await checkSecondaryInGroup(groupId);

      expect(result.success).toBe(true);
      expect(result.hasSecondary).toBe(true);
      expect(result.secondaryInGroup).toBe(false);
    });
  });

  describe("Primary changes Splitwise group - pending invite expiration", () => {
    beforeEach(() => {
      mockGetSplitwiseGroup.mockReset();
    });

    it("should expire pending invite when invitee is NOT in the new group", async () => {
      const oldGroupId = `old-group-${nanoid(10)}`;
      const newGroupId = `new-group-${nanoid(10)}`;
      const inviteeEmail = `invitee-${nanoid(6)}@test.com`;

      // Create primary user with old group and pending invite
      const primary = await createTestUser({
        id: `primary-${nanoid(10)}`,
        persona: "dual",
        onboardingComplete: true,
      });

      await createTestSplitwiseSettings({
        userId: primary.id,
        groupId: oldGroupId,
        groupName: "Old Group",
        emoji: "✅",
        currencyCode: "USD",
      });

      // Create Splitwise account for primary
      await createTestAccount("splitwise", {
        userId: primary.id,
        providerAccountId: `sw-${nanoid(10)}`,
        access_token: "test-api-key",
      });

      // Create a pending invite
      await prisma.partnerInvite.create({
        data: {
          token: `token-${nanoid(12)}`,
          primaryUserId: primary.id,
          groupId: oldGroupId,
          groupName: "Old Group",
          currencyCode: "USD",
          primaryEmoji: "✅",
          partnerEmail: inviteeEmail,
          partnerName: "Invitee",
          status: "pending",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      // Mock the Splitwise API - invitee is NOT in the new group
      mockGetSplitwiseGroup.mockResolvedValue({
        success: true,
        group: {
          id: parseInt(newGroupId),
          name: "New Group",
          members: [
            { id: 1, email: "primary@test.com" },
            { id: 2, email: "someone-else@test.com" }, // Not the invitee!
          ],
        },
      });

      // Mock auth to return primary user
      mockAuth.mockResolvedValue({ user: { id: primary.id } });

      // Primary changes to new group
      const formData = new FormData();
      formData.set("groupId", newGroupId);
      formData.set("groupName", "New Group");
      formData.set("currencyCode", "USD");
      formData.set("emoji", "✅");
      formData.set("splitRatio", "1:1");

      const result = await saveSplitwiseSettings(formData);

      expect(result.success).toBe(true);
      expect(result.inviteExpired).toBe(true);
      expect(result.expiredInviteeName).toBeTruthy();

      // Verify the invite was expired
      const invite = await prisma.partnerInvite.findFirst({
        where: { primaryUserId: primary.id },
      });

      expect(invite?.status).toBe("expired");
    });

    it("should update invite with new group info when invitee IS in the new group", async () => {
      const oldGroupId = `old-group-${nanoid(10)}`;
      const newGroupId = `new-group-${nanoid(10)}`;
      const inviteeEmail = `invitee-${nanoid(6)}@test.com`;

      // Create primary user with old group and pending invite
      const primary = await createTestUser({
        id: `primary-${nanoid(10)}`,
        persona: "dual",
        onboardingComplete: true,
      });

      await createTestSplitwiseSettings({
        userId: primary.id,
        groupId: oldGroupId,
        groupName: "Old Group",
        emoji: "✅",
        currencyCode: "USD",
      });

      // Create Splitwise account for primary
      await createTestAccount("splitwise", {
        userId: primary.id,
        providerAccountId: `sw-${nanoid(10)}`,
        access_token: "test-api-key",
      });

      // Create a pending invite
      await prisma.partnerInvite.create({
        data: {
          token: `token-${nanoid(12)}`,
          primaryUserId: primary.id,
          groupId: oldGroupId,
          groupName: "Old Group",
          currencyCode: "USD",
          primaryEmoji: "✅",
          partnerEmail: inviteeEmail,
          partnerName: "Invitee",
          status: "pending",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      // Mock the Splitwise API - invitee IS in the new group
      mockGetSplitwiseGroup.mockResolvedValue({
        success: true,
        group: {
          id: parseInt(newGroupId),
          name: "New Group",
          members: [
            { id: 1, email: "primary@test.com" },
            { id: 2, email: inviteeEmail }, // Invitee IS in the group
          ],
        },
      });

      // Mock auth to return primary user
      mockAuth.mockResolvedValue({ user: { id: primary.id } });

      // Primary changes to new group
      const formData = new FormData();
      formData.set("groupId", newGroupId);
      formData.set("groupName", "New Group");
      formData.set("currencyCode", "USD");
      formData.set("emoji", "✅");
      formData.set("splitRatio", "1:1");

      const result = await saveSplitwiseSettings(formData);

      expect(result.success).toBe(true);
      expect(result.inviteExpired).toBe(false);

      // Verify the invite was updated with new group info
      const invite = await prisma.partnerInvite.findFirst({
        where: { primaryUserId: primary.id },
      });

      expect(invite?.status).toBe("pending");
      expect(invite?.groupId).toBe(newGroupId);
      expect(invite?.groupName).toBe("New Group");
    });
  });

  describe("linkAsSecondary - existing solo user can rejoin duo", () => {
    it("should link existing fully-configured solo user without re-onboarding", async () => {
      const groupId = `group-${nanoid(10)}`;

      // Create primary user in duo mode
      const primary = await createTestUser({
        id: `primary-${nanoid(10)}`,
        persona: "dual",
        onboardingComplete: true,
      });

      await createTestSplitwiseSettings({
        userId: primary.id,
        groupId,
        groupName: "Shared Group",
        emoji: "✅",
        currencyCode: "USD",
        defaultSplitRatio: "2:1",
      });

      // Create a pending invite from primary
      const token = `token-${nanoid(12)}`;
      await prisma.partnerInvite.create({
        data: {
          token,
          primaryUserId: primary.id,
          groupId,
          groupName: "Shared Group",
          currencyCode: "USD",
          primaryEmoji: "✅",
          status: "pending",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      // Create an existing fully-configured solo user
      const soloUser = await createTestUser({
        id: `solo-${nanoid(10)}`,
        persona: "solo",
        onboardingComplete: true, // Already completed onboarding!
      });

      // Solo user has both accounts
      await createTestAccount("splitwise", {
        userId: soloUser.id,
        providerAccountId: `sw-${nanoid(10)}`,
        access_token: "test-api-key",
      });

      await createTestAccount("ynab", {
        userId: soloUser.id,
        providerAccountId: `ynab-${nanoid(10)}`,
        access_token: "test-ynab-key",
      });

      // Solo user has YNAB settings
      await createTestYnabSettings({
        userId: soloUser.id,
        budgetId: `budget-${nanoid(10)}`,
        splitwiseAccountId: `account-${nanoid(10)}`,
      });

      // Solo user has their own Splitwise settings (different group)
      await createTestSplitwiseSettings({
        userId: soloUser.id,
        groupId: `different-group-${nanoid(10)}`,
        groupName: "My Solo Group",
        emoji: "🔄",
        currencyCode: "CAD",
        defaultSplitRatio: "1:1",
      });

      // Mock auth to return solo user
      mockAuth.mockResolvedValue({ user: { id: soloUser.id } });

      // Solo user accepts the invite
      const result = await linkAsSecondary(token);

      expect(result.success).toBe(true);
      expect(result.skipOnboarding).toBe(true);

      // Verify the user is now linked as secondary
      const updatedUser = await prisma.user.findUnique({
        where: { id: soloUser.id },
      });

      expect(updatedUser?.primaryUserId).toBe(primary.id);
      expect(updatedUser?.persona).toBe("dual");
      expect(updatedUser?.onboardingComplete).toBe(true); // Still complete!

      // Verify their Splitwise settings were updated to match primary
      const updatedSettings = await prisma.splitwiseSettings.findUnique({
        where: { userId: soloUser.id },
      });

      expect(updatedSettings?.groupId).toBe(groupId);
      expect(updatedSettings?.groupName).toBe("Shared Group");
      expect(updatedSettings?.currencyCode).toBe("USD");
      expect(updatedSettings?.defaultSplitRatio).toBe("1:2"); // Reversed from primary's 2:1
      expect(updatedSettings?.emoji).toBe("🔄"); // Kept their original emoji

      // Verify invite was marked as accepted
      const invite = await prisma.partnerInvite.findUnique({
        where: { token },
      });

      expect(invite?.status).toBe("accepted");
      expect(invite?.acceptedByUserId).toBe(soloUser.id);
    });

    it("should pick different emoji if solo user's emoji conflicts with primary", async () => {
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
        emoji: "✅", // Primary uses ✅
        currencyCode: "USD",
      });

      // Create invite
      const token = `token-${nanoid(12)}`;
      await prisma.partnerInvite.create({
        data: {
          token,
          primaryUserId: primary.id,
          groupId,
          currencyCode: "USD",
          primaryEmoji: "✅",
          status: "pending",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      // Create solo user who also uses ✅
      const soloUser = await createTestUser({
        id: `solo-${nanoid(10)}`,
        persona: "solo",
        onboardingComplete: true,
      });

      await createTestAccount("splitwise", {
        userId: soloUser.id,
        providerAccountId: `sw-${nanoid(10)}`,
      });

      await createTestAccount("ynab", {
        userId: soloUser.id,
        providerAccountId: `ynab-${nanoid(10)}`,
      });

      await createTestYnabSettings({
        userId: soloUser.id,
      });

      await createTestSplitwiseSettings({
        userId: soloUser.id,
        emoji: "✅", // SAME as primary - conflict!
      });

      // Mock auth
      mockAuth.mockResolvedValue({ user: { id: soloUser.id } });

      const result = await linkAsSecondary(token);

      expect(result.success).toBe(true);

      // Verify emoji was changed to avoid conflict
      const updatedSettings = await prisma.splitwiseSettings.findUnique({
        where: { userId: soloUser.id },
      });

      expect(updatedSettings?.emoji).not.toBe("✅");
    });

    it("should require new users to go through onboarding", async () => {
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
        currencyCode: "USD",
      });

      // Create invite
      const token = `token-${nanoid(12)}`;
      await prisma.partnerInvite.create({
        data: {
          token,
          primaryUserId: primary.id,
          groupId,
          currencyCode: "USD",
          primaryEmoji: "✅",
          status: "pending",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      // Create a NEW user (no accounts, no settings)
      const newUser = await createTestUser({
        id: `new-${nanoid(10)}`,
        onboardingComplete: false,
      });

      // Mock auth
      mockAuth.mockResolvedValue({ user: { id: newUser.id } });

      const result = await linkAsSecondary(token);

      expect(result.success).toBe(true);
      expect(result.skipOnboarding).toBe(false);

      // Verify user needs to go through onboarding
      const updatedUser = await prisma.user.findUnique({
        where: { id: newUser.id },
      });

      expect(updatedUser?.onboardingComplete).toBe(false);
      expect(updatedUser?.onboardingStep).toBe(0);
    });
  });

  describe("joinHousehold - split ratio reversal", () => {
    it("should reverse split ratio when joining household (2:1 becomes 1:2)", async () => {
      const groupId = `group-${nanoid(10)}`;

      // Create primary user with 2:1 split ratio
      const primary = await createTestUser({
        id: `primary-${nanoid(10)}`,
        persona: "dual",
        onboardingComplete: true,
      });

      await createTestSplitwiseSettings({
        userId: primary.id,
        groupId,
        groupName: "Test Group",
        emoji: "✅",
        currencyCode: "USD",
        defaultSplitRatio: "2:1",
      });

      // Create user who will join the household
      const joiningUser = await createTestUser({
        id: `joining-${nanoid(10)}`,
        persona: "dual",
        onboardingComplete: false,
      });

      // Mock auth to return joining user
      mockAuth.mockResolvedValue({ user: { id: joiningUser.id } });

      const result = await joinHousehold(primary.id, "🔄");

      expect(result.success).toBe(true);

      // Verify secondary has REVERSED split ratio (1:2)
      const secondarySettings = await prisma.splitwiseSettings.findUnique({
        where: { userId: joiningUser.id },
      });

      expect(secondarySettings?.groupId).toBe(groupId);
      expect(secondarySettings?.emoji).toBe("🔄");
      expect(secondarySettings?.defaultSplitRatio).toBe("1:2");
    });

    it("should reverse split ratio when joining household (3:1 becomes 1:3)", async () => {
      const groupId = `group-${nanoid(10)}`;

      // Create primary user with 3:1 split ratio
      const primary = await createTestUser({
        id: `primary-${nanoid(10)}`,
        persona: "dual",
        onboardingComplete: true,
      });

      await createTestSplitwiseSettings({
        userId: primary.id,
        groupId,
        groupName: "Test Group",
        emoji: "✅",
        currencyCode: "USD",
        defaultSplitRatio: "3:1",
      });

      // Create user who will join the household
      const joiningUser = await createTestUser({
        id: `joining-${nanoid(10)}`,
        persona: "dual",
        onboardingComplete: false,
      });

      // Mock auth to return joining user
      mockAuth.mockResolvedValue({ user: { id: joiningUser.id } });

      const result = await joinHousehold(primary.id, "🔄");

      expect(result.success).toBe(true);

      // Verify secondary has REVERSED split ratio (1:3)
      const secondarySettings = await prisma.splitwiseSettings.findUnique({
        where: { userId: joiningUser.id },
      });

      expect(secondarySettings?.defaultSplitRatio).toBe("1:3");
    });

    it("should keep 1:1 ratio unchanged when joining", async () => {
      const groupId = `group-${nanoid(10)}`;

      // Create primary user with 1:1 split ratio
      const primary = await createTestUser({
        id: `primary-${nanoid(10)}`,
        persona: "dual",
        onboardingComplete: true,
      });

      await createTestSplitwiseSettings({
        userId: primary.id,
        groupId,
        groupName: "Test Group",
        emoji: "✅",
        currencyCode: "USD",
        defaultSplitRatio: "1:1",
      });

      // Create user who will join the household
      const joiningUser = await createTestUser({
        id: `joining-${nanoid(10)}`,
        persona: "dual",
        onboardingComplete: false,
      });

      // Mock auth to return joining user
      mockAuth.mockResolvedValue({ user: { id: joiningUser.id } });

      const result = await joinHousehold(primary.id, "🔄");

      expect(result.success).toBe(true);

      // 1:1 reversed is still 1:1
      const secondarySettings = await prisma.splitwiseSettings.findUnique({
        where: { userId: joiningUser.id },
      });

      expect(secondarySettings?.defaultSplitRatio).toBe("1:1");
    });
  });
});
