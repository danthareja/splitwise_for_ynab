import { NextRequest } from "next/server";
import { describe, it, expect, beforeEach } from "vitest";
import { POST } from "@/app/api/sync/group/[groupId]/route";
import { server } from "../setup";
import { handlers } from "../mocks/handlers";
import { createPairedGroupUsers } from "../factories/test-data";

const CRON_SECRET = "test-cron-secret";

function makeRequest(
  groupId: string,
  body: { userIds: string[] },
  token = CRON_SECRET,
) {
  return {
    request: new NextRequest(`http://localhost/api/sync/group/${groupId}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    }),
    params: Promise.resolve({ groupId }),
  };
}

describe("/api/sync/group/[groupId]", () => {
  beforeEach(() => {
    server.use(...handlers);
  });

  describe("Auth", () => {
    it("should return 401 without valid CRON_SECRET", async () => {
      const { request, params } = makeRequest(
        "any-group",
        { userIds: ["u1"] },
        "wrong-secret",
      );
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("Validation", () => {
    it("should return 400 for empty userIds array", async () => {
      const { request, params } = makeRequest("any-group", {
        userIds: [],
      });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("userIds array is required");
    });

    it("should return 400 for missing userIds", async () => {
      const request = new NextRequest(
        "http://localhost/api/sync/group/any-group",
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${CRON_SECRET}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({}),
        },
      );
      const params = Promise.resolve({ groupId: "any-group" });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
    });
  });

  describe("Sync execution", () => {
    it("should successfully sync a paired group", async () => {
      const { user1, user2, groupId } = await createPairedGroupUsers();

      const { request, params } = makeRequest(groupId, {
        userIds: [user1.user.id, user2.user.id],
      });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toBeDefined();
      expect(data.results[user1.user.id]).toBeDefined();
      expect(data.results[user2.user.id]).toBeDefined();
    });
  });
});
