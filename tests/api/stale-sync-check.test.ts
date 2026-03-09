import { NextRequest } from "next/server";
import { describe, it, expect, beforeEach } from "vitest";
import { GET } from "@/app/api/cron/stale-sync-check/route";
import { prisma } from "../setup";
import { createFullyConfiguredUser } from "../factories/test-data";
import * as Sentry from "@sentry/nextjs";

const CRON_SECRET = "test-cron-secret";

function makeRequest(token = CRON_SECRET) {
  return new NextRequest("http://localhost/api/cron/stale-sync-check", {
    headers: { authorization: `Bearer ${token}` },
  });
}

describe("/api/cron/stale-sync-check", () => {
  describe("Auth", () => {
    it("should return 401 without valid CRON_SECRET", async () => {
      const response = await GET(makeRequest("wrong-secret"));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("Stale detection", () => {
    it("should return 0 when no stale records exist", async () => {
      const response = await GET(makeRequest());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.staleCount).toBe(0);
    });

    it("should detect and mark stale pending syncs as error", async () => {
      const userData = await createFullyConfiguredUser({
        user: { id: "stale-check-user", email: "stale-check@test.com" },
      });

      // Create a stale pending sync (15 minutes old)
      const staleSync = await prisma.syncHistory.create({
        data: {
          userId: userData.user.id,
          status: "pending",
          startedAt: new Date(Date.now() - 15 * 60 * 1000),
        },
      });

      const response = await GET(makeRequest());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.staleCount).toBe(1);
      expect(data.staleIds).toContain(staleSync.id);

      // Verify the record was updated
      const updated = await prisma.syncHistory.findUnique({
        where: { id: staleSync.id },
      });
      expect(updated!.status).toBe("error");
      expect(updated!.errorMessage).toBe("Sync timed out (stale pending)");
      expect(updated!.completedAt).toBeDefined();
    });

    it("should fire Sentry alert for each stale record", async () => {
      const userData = await createFullyConfiguredUser({
        user: { id: "sentry-alert-user", email: "sentry@test.com" },
      });

      await prisma.syncHistory.create({
        data: {
          userId: userData.user.id,
          status: "pending",
          startedAt: new Date(Date.now() - 15 * 60 * 1000),
        },
      });

      await GET(makeRequest());

      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        "Stale pending sync detected",
        expect.objectContaining({
          level: "error",
          extra: expect.objectContaining({
            userId: userData.user.id,
            userEmail: "sentry@test.com",
          }),
        }),
      );
    });

    it("should NOT flag recent pending syncs as stale", async () => {
      const userData = await createFullyConfiguredUser({
        user: { id: "recent-check-user", email: "recent-check@test.com" },
      });

      // Create a recent pending sync (2 minutes old - under 10 min threshold)
      await prisma.syncHistory.create({
        data: {
          userId: userData.user.id,
          status: "pending",
          startedAt: new Date(Date.now() - 2 * 60 * 1000),
        },
      });

      const response = await GET(makeRequest());
      const data = await response.json();

      expect(data.staleCount).toBe(0);
    });
  });
});
