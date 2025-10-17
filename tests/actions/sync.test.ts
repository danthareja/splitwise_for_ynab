import { describe, it, expect, vi, beforeEach } from "vitest";
import { syncUserDataAction, getSyncHistory } from "@/app/actions/sync";
import { prisma } from "../setup";
import {
  createTestUser,
  createFullyConfiguredUser,
} from "../factories/test-data";

// Mock auth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock sync service
vi.mock("@/services/sync", () => ({
  syncUserData: vi.fn(),
}));

// Mock rate limit service
vi.mock("@/services/rate-limit", () => ({
  enforcePerUserRateLimit: vi.fn(),
}));

// Mock rate limit lib
vi.mock("@/lib/rate-limit", () => ({
  getRateLimitOptions: vi.fn(() => ({
    maxRequests: 3,
    windowSeconds: 60,
  })),
}));

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { auth } from "@/auth";
import { syncUserData } from "@/services/sync";
import { enforcePerUserRateLimit } from "@/services/rate-limit";

describe("actions/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("syncUserDataAction", () => {
    it("should return error if user not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null as any);

      const result = await syncUserDataAction();

      expect(result.success).toBe(false);
      expect(result.error).toBe("You must be logged in to sync data");
    });

    it("should return error if user not fully configured", async () => {
      const user = await createTestUser();

      vi.mocked(auth).mockResolvedValue({
        user: {
          id: user.id,
          email: user.email,
          disabled: false,
        },
      } as any);

      const result = await syncUserDataAction();

      expect(result.success).toBe(false);
      expect(result.error).toContain(
        "You must complete your Splitwise and YNAB configuration",
      );
    });

    it("should return error if user account is disabled", async () => {
      const userData = await createFullyConfiguredUser();

      // Disable the user
      await prisma.user.update({
        where: { id: userData.user.id },
        data: {
          disabled: true,
          disabledReason: "Token expired",
          suggestedFix: "Please reconnect your account",
        },
      });

      vi.mocked(auth).mockResolvedValue({
        user: {
          id: userData.user.id,
          email: userData.user.email,
          disabled: true,
          disabledReason: "Token expired",
          suggestedFix: "Please reconnect your account",
        },
      } as any);

      const result = await syncUserDataAction();

      expect(result.success).toBe(false);
      expect(result.error).toContain("Please reconnect your account");
    });

    it("should enforce rate limiting", async () => {
      const userData = await createFullyConfiguredUser();

      vi.mocked(auth).mockResolvedValue({
        user: {
          id: userData.user.id,
          email: userData.user.email,
          disabled: false,
        },
      } as any);

      vi.mocked(enforcePerUserRateLimit).mockResolvedValue({
        allowed: false,
        retryAfterSeconds: 120,
      });

      const result = await syncUserDataAction();

      expect(result.success).toBe(false);
      expect(result.error).toContain("manual syncs");
      expect(result.error).toContain("2 minutes");
    });

    it("should successfully sync user data when all checks pass", async () => {
      const userData = await createFullyConfiguredUser();

      vi.mocked(auth).mockResolvedValue({
        user: {
          id: userData.user.id,
          email: userData.user.email,
          disabled: false,
        },
      } as any);

      vi.mocked(enforcePerUserRateLimit).mockResolvedValue({
        allowed: true,
        retryAfterSeconds: 60,
      });

      vi.mocked(syncUserData).mockResolvedValue({
        success: true,
        syncHistoryId: "sync-123",
        syncedTransactions: [],
        syncedExpenses: [],
      });

      const result = await syncUserDataAction();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.syncHistoryId).toBe("sync-123");
      }
      expect(syncUserData).toHaveBeenCalledWith(userData.user.id);
    });

    it("should handle sync service errors", async () => {
      const userData = await createFullyConfiguredUser();

      vi.mocked(auth).mockResolvedValue({
        user: {
          id: userData.user.id,
          email: userData.user.email,
          disabled: false,
        },
      } as any);

      vi.mocked(enforcePerUserRateLimit).mockResolvedValue({
        allowed: true,
        retryAfterSeconds: 60,
      });

      vi.mocked(syncUserData).mockRejectedValue(new Error("Sync failed"));

      const result = await syncUserDataAction();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Sync failed");
    });
  });

  describe("getSyncHistory", () => {
    it("should return error if user not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null as any);

      const result = await getSyncHistory();

      expect(result.success).toBe(false);
      expect(result.error).toBe("You must be logged in to view sync history");
    });

    it("should return sync history for authenticated user", async () => {
      const userData = await createFullyConfiguredUser();

      // Create some sync history
      const syncHistory1 = await prisma.syncHistory.create({
        data: {
          userId: userData.user.id,
          status: "success",
          startedAt: new Date("2024-01-15T10:00:00Z"),
          completedAt: new Date("2024-01-15T10:05:00Z"),
        },
      });

      const syncHistory2 = await prisma.syncHistory.create({
        data: {
          userId: userData.user.id,
          status: "partial",
          startedAt: new Date("2024-01-16T10:00:00Z"),
          completedAt: new Date("2024-01-16T10:05:00Z"),
        },
      });

      // Add synced items
      await prisma.syncedItem.create({
        data: {
          syncHistoryId: syncHistory1.id,
          externalId: "txn-1",
          type: "ynab_transaction",
          amount: 25.5,
          description: "Test transaction",
          date: "2024-01-15",
          direction: "ynab_to_splitwise",
          status: "success",
        },
      });

      vi.mocked(auth).mockResolvedValue({
        user: {
          id: userData.user.id,
          email: userData.user.email,
        },
      } as any);

      const result = await getSyncHistory();

      expect(result.success).toBe(true);
      expect(result.syncHistory).toBeDefined();
      expect(result.syncHistory!.length).toBe(2);
      expect(result.syncHistory![0]!.id).toBe(syncHistory2.id); // Most recent first
      expect(result.syncHistory![1]!.id).toBe(syncHistory1.id);
    });

    it("should limit sync history results", async () => {
      const userData = await createFullyConfiguredUser();

      // Create more sync history than the limit
      for (let i = 0; i < 10; i++) {
        await prisma.syncHistory.create({
          data: {
            userId: userData.user.id,
            status: "success",
            startedAt: new Date(`2024-01-${10 + i}T10:00:00Z`),
            completedAt: new Date(`2024-01-${10 + i}T10:05:00Z`),
          },
        });
      }

      vi.mocked(auth).mockResolvedValue({
        user: {
          id: userData.user.id,
          email: userData.user.email,
        },
      } as any);

      const result = await getSyncHistory(5);

      expect(result.success).toBe(true);
      expect(result.syncHistory).toBeDefined();
      expect(result.syncHistory!.length).toBe(5);
    });

    it("should sort synced items by date", async () => {
      const userData = await createFullyConfiguredUser();

      const syncHistory = await prisma.syncHistory.create({
        data: {
          userId: userData.user.id,
          status: "success",
          startedAt: new Date("2024-01-15T10:00:00Z"),
          completedAt: new Date("2024-01-15T10:05:00Z"),
        },
      });

      await prisma.syncedItem.create({
        data: {
          syncHistoryId: syncHistory.id,
          externalId: "txn-1",
          type: "ynab_transaction",
          amount: 25.5,
          description: "Old transaction",
          date: "2024-01-10",
          direction: "ynab_to_splitwise",
          status: "success",
        },
      });

      await prisma.syncedItem.create({
        data: {
          syncHistoryId: syncHistory.id,
          externalId: "txn-2",
          type: "ynab_transaction",
          amount: 30.0,
          description: "New transaction",
          date: "2024-01-20",
          direction: "ynab_to_splitwise",
          status: "success",
        },
      });

      vi.mocked(auth).mockResolvedValue({
        user: {
          id: userData.user.id,
          email: userData.user.email,
        },
      } as any);

      const result = await getSyncHistory();

      expect(result.success).toBe(true);
      expect(result.syncHistory![0]!.syncedItems[0]!.description).toBe(
        "New transaction",
      );
      expect(result.syncHistory![0]!.syncedItems[1]!.description).toBe(
        "Old transaction",
      );
    });

    it("should handle database errors", async () => {
      const userData = await createFullyConfiguredUser();

      vi.mocked(auth).mockResolvedValue({
        user: {
          id: userData.user.id,
          email: userData.user.email,
        },
      } as any);

      // Force a database error by querying a non-existent field
      vi.spyOn(prisma.syncHistory, "findMany").mockRejectedValue(
        new Error("Database error"),
      );

      const result = await getSyncHistory();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database error");
    });
  });
});
