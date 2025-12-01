import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "../setup";
import {
  createTestUser,
  createTestSplitwiseSettings,
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

    it("should orphan secondary when primary confirms switch to solo", async () => {
      const primary = await createTestUser({
        id: `primary-${nanoid(10)}`,
        persona: "dual",
        onboardingComplete: true,
      });

      const secondary = await createTestUser({
        id: `secondary-${nanoid(10)}`,
        persona: "dual",
        primaryUserId: primary.id,
        onboardingComplete: true,
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

      // Verify secondary is orphaned (primaryUserId cleared)
      const updatedSecondary = await prisma.user.findUnique({
        where: { id: secondary.id },
      });
      expect(updatedSecondary?.primaryUserId).toBeNull();
      // Secondary keeps their persona - they can decide what to do
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
});
