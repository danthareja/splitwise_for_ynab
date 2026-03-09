import { NextRequest } from "next/server";
import { describe, it, expect, beforeEach } from "vitest";
import { GET } from "@/app/api/sync/user/[userId]/route";
import { server } from "../setup";
import { handlers } from "../mocks/handlers";
import { createFullyConfiguredUser } from "../factories/test-data";

const CRON_SECRET = "test-cron-secret";

function makeRequest(userId: string, token = CRON_SECRET) {
  return {
    request: new NextRequest(`http://localhost/api/sync/user/${userId}`, {
      headers: { authorization: `Bearer ${token}` },
    }),
    params: Promise.resolve({ userId }),
  };
}

describe("/api/sync/user/[userId]", () => {
  beforeEach(() => {
    server.use(...handlers);
  });

  describe("Auth", () => {
    it("should return 401 without valid CRON_SECRET", async () => {
      const { request, params } = makeRequest("any-user", "wrong-secret");
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 401 with missing authorization header", async () => {
      const request = new NextRequest(
        "http://localhost/api/sync/user/any-user",
      );
      const params = Promise.resolve({ userId: "any-user" });
      const response = await GET(request, { params });

      expect(response.status).toBe(401);
    });
  });

  describe("Sync execution", () => {
    it("should successfully sync a single user", async () => {
      const userData = await createFullyConfiguredUser({
        splitwiseSettings: { groupId: "per-user-group" },
      });

      const { request, params } = makeRequest(userData.user.id);
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.syncHistoryId).toBeDefined();
    });

    it("should return 500 for non-existent user", async () => {
      const { request, params } = makeRequest("non-existent-user-id");
      const response = await GET(request, { params });

      expect(response.status).toBe(500);
    });
  });
});
