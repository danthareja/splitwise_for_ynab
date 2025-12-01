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

// Import after mocking
import { getPartnershipStatus } from "@/app/actions/db";

/**
 * Tests for Partnership Status - QA.md Section 2.2, 3.1
 */

describe("actions/db - getPartnershipStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Partnership Types", () => {
    it("should return 'solo' for solo user", async () => {
      const user = await createTestUser({
        id: `user-${nanoid(10)}`,
        persona: "solo",
        onboardingComplete: true,
      });

      mockAuth.mockResolvedValue({ user: { id: user.id } });

      const status = await getPartnershipStatus();

      expect(status?.type).toBe("solo");
    });

    it("should return 'primary_waiting' for dual user without secondary", async () => {
      const user = await createTestUser({
        id: `user-${nanoid(10)}`,
        persona: "dual",
        onboardingComplete: true,
      });

      mockAuth.mockResolvedValue({ user: { id: user.id } });

      const status = await getPartnershipStatus();

      expect(status?.type).toBe("primary_waiting");
    });

    it("should return 'primary' for dual user with secondary", async () => {
      const primary = await createTestUser({
        id: `primary-${nanoid(10)}`,
        persona: "dual",
        onboardingComplete: true,
      });

      const secondary = await createTestUser({
        id: `secondary-${nanoid(10)}`,
        name: "Secondary User",
        firstName: "Secondary",
        email: "secondary@test.com",
        persona: "dual",
        primaryUserId: primary.id,
        onboardingComplete: true,
      });

      mockAuth.mockResolvedValue({ user: { id: primary.id } });

      const status = await getPartnershipStatus();

      expect(status?.type).toBe("primary");
      expect("secondaryName" in status! && status.secondaryName).toBe(
        "Secondary",
      );
      expect("secondaryEmail" in status! && status.secondaryEmail).toBe(
        "secondary@test.com",
      );
    });

    it("should return 'secondary' for user linked to primary", async () => {
      const groupId = `group-${nanoid(10)}`;

      const primary = await createTestUser({
        id: `primary-${nanoid(10)}`,
        name: "Primary User",
        firstName: "Primary",
        email: "primary@test.com",
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

      mockAuth.mockResolvedValue({ user: { id: secondary.id } });

      const status = await getPartnershipStatus();

      expect(status?.type).toBe("secondary");
      expect("primaryName" in status! && status.primaryName).toBe("Primary");
      expect("primaryEmail" in status! && status.primaryEmail).toBe(
        "primary@test.com",
      );
      expect("primaryEmoji" in status! && status.primaryEmoji).toBe("✅");
    });

    // Note: True orphaned state (primary deleted) is hard to test because:
    // 1. FK constraint prevents deletion while secondary references primary
    // 2. Cascade delete would remove the reference
    // The orphaned state occurs when primaryUserId points to a non-existent user
    // which happens in production when cascades are not configured.
    // This is tested via the E2E tests instead.
    it.skip("should return 'orphaned' when secondary's primary no longer exists", async () => {
      // This test requires special DB setup to simulate orphaned state
    });
  });

  describe("Null/Undefined Handling", () => {
    it("should return null when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const status = await getPartnershipStatus();

      expect(status).toBeNull();
    });

    it("should return null when user not found", async () => {
      mockAuth.mockResolvedValue({ user: { id: "nonexistent" } });

      const status = await getPartnershipStatus();

      expect(status).toBeNull();
    });
  });
});
