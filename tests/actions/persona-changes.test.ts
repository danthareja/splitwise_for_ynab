import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "../setup";
import {
  createTestUser,
  createTestSplitwiseSettings,
  createTestYnabSettings,
  createTestAccount,
} from "../factories/db-factories";
import { nanoid } from "nanoid";

// Mock auth to return our test user
const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Import after mocking
import { updatePersonaWithPartnerHandling } from "@/app/actions/user";
import {
  saveSplitwiseSettings,
  createPartnerInvite,
  linkAsSecondary,
} from "@/app/actions/splitwise";

/**
 * Tests for Persona Changes - QA.md Section 3.2
 */

describe("actions/user - Persona Changes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("3.2 Solo → Dual (safe, no confirmation)", () => {
    it("should allow solo user to switch to dual", async () => {
      const user = await createTestUser({
        id: `user-${nanoid(10)}`,
        persona: "solo",
        onboardingComplete: true,
      });

      mockAuth.mockResolvedValue({ user: { id: user.id } });

      const result = await updatePersonaWithPartnerHandling("dual");

      expect(result.success).toBe(true);

      // Verify user is now dual
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      expect(updatedUser?.persona).toBe("dual");
    });
  });

  describe("3.2 Dual (Primary waiting) → Solo", () => {
    it("should allow primary without partner to switch to solo", async () => {
      const user = await createTestUser({
        id: `user-${nanoid(10)}`,
        persona: "dual",
        onboardingComplete: true,
        // No secondary linked
      });

      mockAuth.mockResolvedValue({ user: { id: user.id } });

      const result = await updatePersonaWithPartnerHandling("solo");

      expect(result.success).toBe(true);

      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      expect(updatedUser?.persona).toBe("solo");
    });

    it("should expire pending invites when switching to solo", async () => {
      const groupId = `group-${nanoid(10)}`;

      const user = await createTestUser({
        id: `user-${nanoid(10)}`,
        persona: "dual",
        onboardingComplete: true,
      });

      await createTestSplitwiseSettings({
        userId: user.id,
        groupId,
        emoji: "✅",
        currencyCode: "USD",
      });

      // Create pending invite using the server action
      mockAuth.mockResolvedValue({ user: { id: user.id } });

      // Import createPartnerInvite
      const { createPartnerInvite } = await import("@/app/actions/splitwise");
      const inviteResult = await createPartnerInvite({
        partnerEmail: "partner@example.com",
        sendEmail: false,
      });

      expect(inviteResult.success).toBe(true);
      const token = inviteResult.token!;

      // Now switch to solo
      const result = await updatePersonaWithPartnerHandling("solo");

      expect(result.success).toBe(true);

      // Verify invite is expired
      const invite = await prisma.partnerInvite.findUnique({
        where: { token },
      });

      expect(invite?.status).toBe("expired");
    });
  });

  describe("3.2 Dual (Primary with Partner) → Solo", () => {
    it("should require confirmation when primary has partner", async () => {
      const primary = await createTestUser({
        id: `primary-${nanoid(10)}`,
        persona: "dual",
        onboardingComplete: true,
      });

      // Create linked secondary
      const secondary = await createTestUser({
        id: `secondary-${nanoid(10)}`,
        name: "Partner Name",
        persona: "dual",
        primaryUserId: primary.id,
        onboardingComplete: true,
      });

      mockAuth.mockResolvedValue({ user: { id: primary.id } });

      // First call without confirmation
      const result = await updatePersonaWithPartnerHandling("solo", false);

      expect(result.success).toBe(false);
      expect(
        "requiresConfirmation" in result && result.requiresConfirmation,
      ).toBe(true);
      expect("confirmationType" in result && result.confirmationType).toBe(
        "primary_has_partner",
      );
      expect("partnerName" in result && result.partnerName).toBe(
        "Partner Name",
      );
    });

    it("should disconnect secondary and convert to solo when primary confirms switch", async () => {
      const groupId = `group-${nanoid(10)}`;

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
      });

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

      mockAuth.mockResolvedValue({ user: { id: primary.id } });

      // Confirm the switch
      const result = await updatePersonaWithPartnerHandling("solo", true);

      expect(result.success).toBe(true);

      // Verify primary is now solo
      const updatedPrimary = await prisma.user.findUnique({
        where: { id: primary.id },
      });
      expect(updatedPrimary?.persona).toBe("solo");

      // Verify secondary is disconnected and converted to solo
      const updatedSecondary = await prisma.user.findUnique({
        where: { id: secondary.id },
        include: { splitwiseSettings: true },
      });
      expect(updatedSecondary?.primaryUserId).toBeNull();
      expect(updatedSecondary?.persona).toBe("solo");
      expect(updatedSecondary?.onboardingComplete).toBe(false);
      expect(updatedSecondary?.onboardingStep).toBe(3); // Configure Splitwise step

      // Verify secondary's group settings are cleared
      expect(updatedSecondary?.splitwiseSettings?.groupId).toBeNull();
      expect(updatedSecondary?.splitwiseSettings?.currencyCode).toBeNull();
      // Personal settings are kept
      expect(updatedSecondary?.splitwiseSettings?.emoji).toBe("🔄");
    });
  });

  describe("3.2 Dual (Secondary) → Solo", () => {
    it("should require confirmation when secondary wants to leave", async () => {
      const groupId = `group-${nanoid(10)}`;

      const primary = await createTestUser({
        id: `primary-${nanoid(10)}`,
        name: "Primary Name",
        persona: "dual",
        onboardingComplete: true,
      });

      await createTestSplitwiseSettings({
        userId: primary.id,
        groupId,
        groupName: "Shared Group",
        emoji: "✅",
        currencyCode: "USD",
      });

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

      mockAuth.mockResolvedValue({ user: { id: secondary.id } });

      // First call without confirmation
      const result = await updatePersonaWithPartnerHandling("solo", false);

      expect(result.success).toBe(false);
      expect(
        "requiresConfirmation" in result && result.requiresConfirmation,
      ).toBe(true);
      expect("confirmationType" in result && result.confirmationType).toBe(
        "secondary_leaving",
      );
    });

    it("should clear group settings when secondary leaves", async () => {
      const groupId = `group-${nanoid(10)}`;

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

      const secondary = await createTestUser({
        id: `secondary-${nanoid(10)}`,
        persona: "dual",
        primaryUserId: primary.id,
        onboardingComplete: true,
      });

      await createTestSplitwiseSettings({
        userId: secondary.id,
        groupId,
        groupName: "Shared Group",
        emoji: "🔄",
        currencyCode: "USD",
        defaultSplitRatio: "1:2",
      });

      mockAuth.mockResolvedValue({ user: { id: secondary.id } });

      // Confirm the leave
      const result = await updatePersonaWithPartnerHandling("solo", true);

      expect(result.success).toBe(true);

      // Verify secondary is unlinked and solo
      const updatedSecondary = await prisma.user.findUnique({
        where: { id: secondary.id },
      });
      expect(updatedSecondary?.primaryUserId).toBeNull();
      expect(updatedSecondary?.persona).toBe("solo");

      // Verify group settings are cleared (but emoji kept)
      const secondarySettings = await prisma.splitwiseSettings.findUnique({
        where: { userId: secondary.id },
      });
      expect(secondarySettings?.groupId).toBeNull();
      expect(secondarySettings?.currencyCode).toBeNull();
      expect(secondarySettings?.defaultSplitRatio).toBeNull();
      // Personal settings are kept
      expect(secondarySettings?.emoji).toBe("🔄");
    });
  });

  describe("3.2 Complete Re-join Flow: Secondary → Solo → Dual (via invite)", () => {
    it("should allow ex-secondary to re-join via new invite", async () => {
      const groupId = `group-${nanoid(10)}`;

      // Setup: Create primary with settings
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

      // Create secondary with full configuration
      const secondary = await createTestUser({
        id: `secondary-${nanoid(10)}`,
        email: "secondary@example.com",
        persona: "dual",
        primaryUserId: primary.id,
        onboardingComplete: true,
      });

      await createTestSplitwiseSettings({
        userId: secondary.id,
        groupId,
        groupName: "Shared Group",
        emoji: "🔄",
        currencyCode: "USD",
        defaultSplitRatio: "1:2",
      });

      // Add YNAB settings to make secondary "fully configured"
      await createTestAccount("splitwise", {
        userId: secondary.id,
        providerAccountId: `sw-${nanoid(10)}`,
      });

      await createTestAccount("ynab", {
        userId: secondary.id,
        providerAccountId: `ynab-${nanoid(10)}`,
      });

      await createTestYnabSettings({
        userId: secondary.id,
        budgetId: `budget-${nanoid(10)}`,
        budgetName: "Test Budget",
        splitwiseAccountId: `account-${nanoid(10)}`,
        splitwiseAccountName: "Splitwise Account",
      });

      // Step 1: Secondary leaves
      mockAuth.mockResolvedValue({ user: { id: secondary.id } });
      const leaveResult = await updatePersonaWithPartnerHandling("solo", true);
      expect(leaveResult.success).toBe(true);

      // Verify secondary is now solo with cleared group settings
      let updatedSecondary = await prisma.user.findUnique({
        where: { id: secondary.id },
        include: { splitwiseSettings: true },
      });
      expect(updatedSecondary?.persona).toBe("solo");
      expect(updatedSecondary?.primaryUserId).toBeNull();
      expect(updatedSecondary?.splitwiseSettings?.groupId).toBeNull();

      // Step 2: Primary creates new invite
      mockAuth.mockResolvedValue({ user: { id: primary.id } });
      const inviteResult = await createPartnerInvite({
        partnerEmail: "secondary@example.com",
        sendEmail: false,
      });
      expect(inviteResult.success).toBe(true);
      const token = inviteResult.token!;

      // Step 3: Ex-secondary accepts invite
      mockAuth.mockResolvedValue({ user: { id: secondary.id } });
      const joinResult = await linkAsSecondary(token);
      expect(joinResult.success).toBe(true);
      // Since secondary was fully configured, should skip onboarding
      expect("skipOnboarding" in joinResult && joinResult.skipOnboarding).toBe(
        true,
      );

      // Verify secondary is linked again with correct settings
      updatedSecondary = await prisma.user.findUnique({
        where: { id: secondary.id },
        include: { splitwiseSettings: true },
      });
      expect(updatedSecondary?.persona).toBe("dual");
      expect(updatedSecondary?.primaryUserId).toBe(primary.id);
      expect(updatedSecondary?.splitwiseSettings?.groupId).toBe(groupId);
      expect(updatedSecondary?.splitwiseSettings?.currencyCode).toBe("USD");
      // Split ratio should be reversed from primary's
      expect(updatedSecondary?.splitwiseSettings?.defaultSplitRatio).toBe(
        "1:2",
      );
    });

    it("should block ex-secondary from selecting old shared group", async () => {
      const groupId = `group-${nanoid(10)}`;

      // Setup: Create primary with settings
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
      });

      // Create secondary
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

      // Step 1: Secondary leaves
      mockAuth.mockResolvedValue({ user: { id: secondary.id } });
      const leaveResult = await updatePersonaWithPartnerHandling("solo", true);
      expect(leaveResult.success).toBe(true);

      // Step 2: Ex-secondary tries to use the old group
      const formData = new FormData();
      formData.set("groupId", groupId);
      formData.set("groupName", "Shared Group");
      formData.set("currencyCode", "USD");
      formData.set("emoji", "🔄");
      formData.set("splitRatio", "1:1");

      const saveResult = await saveSplitwiseSettings(formData);

      expect(saveResult.success).toBe(false);
      expect(
        "isGroupConflict" in saveResult && saveResult.isGroupConflict,
      ).toBe(true);
      expect(saveResult.error).toContain("already used");
    });
  });

  describe("3.2 Primary → Solo → Dual (create new Duo)", () => {
    it("should allow ex-primary to switch back to dual and invite new partner", async () => {
      const groupId = `group-${nanoid(10)}`;

      // Setup: Create primary with secondary
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
      });

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

      // Step 1: Primary disconnects secondary (switches to solo)
      mockAuth.mockResolvedValue({ user: { id: primary.id } });
      const disconnectResult = await updatePersonaWithPartnerHandling(
        "solo",
        true,
      );
      expect(disconnectResult.success).toBe(true);

      // Verify primary is solo
      let updatedPrimary = await prisma.user.findUnique({
        where: { id: primary.id },
      });
      expect(updatedPrimary?.persona).toBe("solo");

      // Verify secondary is orphaned (primaryUserId cleared)
      const updatedSecondary = await prisma.user.findUnique({
        where: { id: secondary.id },
      });
      expect(updatedSecondary?.primaryUserId).toBeNull();

      // Step 2: Primary switches back to dual
      const toDualResult = await updatePersonaWithPartnerHandling("dual");
      expect(toDualResult.success).toBe(true);

      updatedPrimary = await prisma.user.findUnique({
        where: { id: primary.id },
      });
      expect(updatedPrimary?.persona).toBe("dual");

      // Step 3: Primary creates new invite
      const inviteResult = await createPartnerInvite({
        partnerEmail: "newpartner@example.com",
        sendEmail: false,
      });
      expect(inviteResult.success).toBe(true);

      // Verify invite was created
      const invite = await prisma.partnerInvite.findUnique({
        where: { token: inviteResult.token! },
      });
      expect(invite).not.toBeNull();
      expect(invite?.status).toBe("pending");
      expect(invite?.partnerEmail).toBe("newpartner@example.com");
    });
  });
});
