import { NextRequest } from "next/server";
import { describe, it, expect, beforeEach } from "vitest";
import { GET } from "@/app/api/sync/route";
import { server } from "../setup";
import { handlers } from "../mocks/handlers";
import {
  createTestUser,
  createFullyConfiguredUser,
  createPairedGroupUsers,
} from "../factories/test-data";

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

  describe("Full Sync", () => {
    it("should successfully perform full sync with CRON_SECRET", async () => {
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

      expect(response.status).toBe(200);
      expect(data.totalUsers).toBe(3);
      expect(data.successCount).toBe(3);
      expect(data.errorCount).toBe(0);
      expect(data.results).toBeDefined();
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
      // Limits configured in .env.test
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
