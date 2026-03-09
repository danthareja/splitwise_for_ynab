import { NextRequest } from "next/server";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "@/app/api/sync/route";
import { server } from "../setup";
import { handlers } from "../mocks/handlers";
import {
  createTestUser,
  createFullyConfiguredUser,
  createPairedGroupUsers,
} from "../factories/test-data";
import * as Sentry from "@sentry/nextjs";

const CRON_SECRET = "test-cron-secret"; // Same as in .env.test

describe("/api/sync API Integration Tests", () => {
  beforeEach(() => {
    server.use(...handlers);
  });

  describe("Authentication", () => {
    it("should return 401 for missing authorization header", async () => {
      const request = new NextRequest("http://localhost/api/sync");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 401 for invalid bearer token format", async () => {
      const request = new NextRequest("http://localhost/api/sync", {
        headers: {
          authorization: "InvalidToken",
        },
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 401 for non-existent user API key", async () => {
      const request = new NextRequest("http://localhost/api/sync", {
        headers: {
          authorization: "Bearer non-existent-api-key",
        },
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("Full Sync (fan-out orchestrator)", () => {
    it("should return 200 with results when triggered with CRON_SECRET", async () => {
      await createFullyConfiguredUser({
        user: { id: "single-user", email: "single@example.com" },
        splitwiseSettings: { groupId: "single-group-123" },
      });

      await createPairedGroupUsers();

      const request = new NextRequest("http://localhost/api/sync", {
        headers: {
          authorization: `Bearer ${CRON_SECRET}`,
        },
      });

      const response = await GET(request);
      const data = await response.json();

      // The orchestrator dispatches HTTP calls to child endpoints,
      // which will fail in test (no server running), but the orchestrator
      // itself should return 200 with error counts reflecting the failures
      expect(response.status).toBe(200);
      expect(data.totalUsers).toBe(3);
      expect(data.results).toBeDefined();
    });

    it("should fire Sentry check-in for vercel-cron user-agent", async () => {
      vi.mocked(Sentry.captureCheckIn).mockClear();

      const request = new NextRequest("http://localhost/api/sync", {
        headers: {
          authorization: `Bearer ${CRON_SECRET}`,
          "user-agent": "vercel-cron/1.0",
        },
      });

      await GET(request);

      // Should have called captureCheckIn at least twice (in_progress + ok/error)
      expect(Sentry.captureCheckIn).toHaveBeenCalledWith(
        expect.objectContaining({
          monitorSlug: "daily-sync",
          status: "in_progress",
        }),
        expect.anything(),
      );
    });

    it("should NOT fire Sentry check-in for manual CRON_SECRET triggers", async () => {
      vi.mocked(Sentry.captureCheckIn).mockClear();

      const request = new NextRequest("http://localhost/api/sync", {
        headers: {
          authorization: `Bearer ${CRON_SECRET}`,
          // No vercel-cron user-agent
        },
      });

      await GET(request);

      // Should NOT have called captureCheckIn with in_progress
      expect(Sentry.captureCheckIn).not.toHaveBeenCalledWith(
        expect.objectContaining({
          monitorSlug: "daily-sync",
          status: "in_progress",
        }),
        expect.anything(),
      );
    });
  });

  describe("Individual User Sync", () => {
    it("should successfully sync single user with no paired group", async () => {
      const userData = await createFullyConfiguredUser({
        splitwiseSettings: { groupId: "single-group-123" },
      });

      const request = new NextRequest("http://localhost/api/sync", {
        headers: {
          authorization: `Bearer ${userData.user.apiKey}`,
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.syncHistoryId).toBeDefined();

      // Comes from test-data.ts
      expect(data.syncedTransactions.length).toBe(1);
      expect(data.syncedExpenses.length).toBe(0);
    });

    it("should return 403 for user not fully configured", async () => {
      const user = await createTestUser();

      const request = new NextRequest("http://localhost/api/sync", {
        headers: {
          authorization: `Bearer ${user.apiKey}`,
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain(
        "complete your Splitwise and YNAB configuration",
      );
    });

    it("should handle rate limiting", async () => {
      // Limits configured in vitest.config.ts
      const userData = await createFullyConfiguredUser();

      const request = new NextRequest("http://localhost/api/sync", {
        headers: {
          authorization: `Bearer ${userData.user.apiKey}`,
        },
      });

      const response1 = await GET(request);
      const data1 = await response1.json();
      expect(response1.status).toBe(200);
      expect(data1.success).toBe(true);

      const response2 = await GET(request);
      const data2 = await response2.json();

      expect(response2.status).toBe(429);
      expect(response2.headers.get("Retry-After")).toBeDefined();
      expect(data2.success).toBe(false);
      expect(data2.error).toContain("manual syncs");
    });
  });

  describe("Paired Group Sync", () => {
    it("should successfully sync paired group users", async () => {
      const { user1 } = await createPairedGroupUsers();

      const request1 = new NextRequest("http://localhost/api/sync", {
        headers: {
          authorization: `Bearer ${user1.user.apiKey}`,
        },
      });

      const response1 = await GET(request1);
      const data1 = await response1.json();

      expect(response1.status).toBe(200);
      expect(data1.success).toBe(true);

      // Comes from test-data.ts
      expect(data1.syncedTransactions.length).toBe(1);
      expect(data1.syncedExpenses.length).toBe(0);
    });
  });
});
