import { NextRequest } from "next/server";
import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/cron/lifecycle-emails/route";
import { prisma } from "../setup";
import { createTestUser, createTestSyncHistory } from "../factories/test-data";
import { TRIAL_DAYS } from "@/lib/stripe-pricing";

const CRON_SECRET = "test-cron-secret";

function makeRequest() {
  return new NextRequest("http://localhost/api/cron/lifecycle-emails", {
    headers: { authorization: `Bearer ${CRON_SECRET}` },
  });
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

describe("/api/cron/lifecycle-emails", () => {
  describe("Auth", () => {
    it("returns 401 without valid CRON_SECRET", async () => {
      const request = new NextRequest(
        "http://localhost/api/cron/lifecycle-emails",
        {
          headers: { authorization: "Bearer wrong-secret" },
        },
      );
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("returns 401 without authorization header", async () => {
      const request = new NextRequest(
        "http://localhost/api/cron/lifecycle-emails",
      );
      const response = await GET(request);
      expect(response.status).toBe(401);
    });
  });

  describe("Trial midpoint", () => {
    it("sends midpoint email when daysLeft <= TRIAL_DAYS/2", async () => {
      const user = await createTestUser({
        subscriptionStatus: "trialing",
        trialEndsAt: daysFromNow(Math.floor(TRIAL_DAYS / 2)),
      });

      const response = await GET(makeRequest());
      const data = await response.json();

      expect(data.trialMidpoint.sent).toBe(1);

      const sends = await prisma.emailSend.findMany({
        where: { userId: user.id },
      });
      expect(sends).toHaveLength(1);
      expect(sends[0].category).toBe("trial");
      expect(sends[0].emailKey).toBe("trial.midpoint");
    });

    it("does not send if trial just started (daysLeft > TRIAL_DAYS/2)", async () => {
      await createTestUser({
        subscriptionStatus: "trialing",
        trialEndsAt: daysFromNow(TRIAL_DAYS - 1),
      });

      const response = await GET(makeRequest());
      const data = await response.json();

      expect(data.trialMidpoint.sent).toBe(0);
    });

    it("does not send if already sent (EmailSend exists for trial.midpoint)", async () => {
      const user = await createTestUser({
        subscriptionStatus: "trialing",
        trialEndsAt: daysFromNow(Math.floor(TRIAL_DAYS / 2)),
      });

      await prisma.emailSend.create({
        data: {
          userId: user.id,
          category: "trial",
          emailKey: "trial.midpoint",
        },
      });

      const response = await GET(makeRequest());
      const data = await response.json();

      expect(data.trialMidpoint.sent).toBe(0);
      expect(data.trialMidpoint.processed).toBe(0);
    });

    it("skips unsubscribed users (EmailUnsubscribe for trial)", async () => {
      const user = await createTestUser({
        subscriptionStatus: "trialing",
        trialEndsAt: daysFromNow(Math.floor(TRIAL_DAYS / 2)),
      });

      await prisma.emailUnsubscribe.create({
        data: { userId: user.id, category: "trial" },
      });

      const response = await GET(makeRequest());
      const data = await response.json();

      expect(data.trialMidpoint.sent).toBe(0);
      expect(data.trialMidpoint.processed).toBe(0);
    });

    it("skips non-trialing users", async () => {
      await createTestUser({
        subscriptionStatus: "active",
        trialEndsAt: daysFromNow(Math.floor(TRIAL_DAYS / 2)),
      });

      const response = await GET(makeRequest());
      const data = await response.json();

      expect(data.trialMidpoint.sent).toBe(0);
      expect(data.trialMidpoint.processed).toBe(0);
    });

    it("includes usage stats when user has synced", async () => {
      const user = await createTestUser({
        subscriptionStatus: "trialing",
        trialEndsAt: daysFromNow(Math.floor(TRIAL_DAYS / 2)),
      });

      // Create sync history with synced items
      const syncHistory = await createTestSyncHistory({
        userId: user.id,
        status: "success",
      });

      await prisma.syncedItem.createMany({
        data: [
          {
            syncHistoryId: syncHistory.id,
            externalId: "txn-1",
            type: "ynab_transaction",
            amount: 10.0,
            date: "2025-01-01",
            direction: "ynab_to_splitwise",
            status: "success",
          },
          {
            syncHistoryId: syncHistory.id,
            externalId: "exp-1",
            type: "splitwise_expense",
            amount: 20.0,
            date: "2025-01-01",
            direction: "splitwise_to_ynab",
            status: "success",
          },
        ],
      });

      const response = await GET(makeRequest());
      const data = await response.json();

      expect(data.trialMidpoint.sent).toBe(1);
    });

    it("sends nudge-to-sync variant when user has zero syncs", async () => {
      await createTestUser({
        subscriptionStatus: "trialing",
        trialEndsAt: daysFromNow(Math.floor(TRIAL_DAYS / 2)),
      });

      const response = await GET(makeRequest());
      const data = await response.json();

      // Should still send (the zero-sync variant)
      expect(data.trialMidpoint.sent).toBe(1);
    });

    it("skips users without email", async () => {
      await createTestUser({
        email: null,
        subscriptionStatus: "trialing",
        trialEndsAt: daysFromNow(Math.floor(TRIAL_DAYS / 2)),
      });

      const response = await GET(makeRequest());
      const data = await response.json();

      expect(data.trialMidpoint.processed).toBe(0);
      expect(data.trialMidpoint.sent).toBe(0);
    });

    it("is idempotent - running twice only sends once", async () => {
      await createTestUser({
        subscriptionStatus: "trialing",
        trialEndsAt: daysFromNow(Math.floor(TRIAL_DAYS / 2)),
      });

      const response1 = await GET(makeRequest());
      const data1 = await response1.json();
      expect(data1.trialMidpoint.sent).toBe(1);

      const response2 = await GET(makeRequest());
      const data2 = await response2.json();
      expect(data2.trialMidpoint.sent).toBe(0);
    });
  });

  describe("Win-back", () => {
    it("sends email 1 after 3 days", async () => {
      const user = await createTestUser({
        subscriptionStatus: "canceled",
        stripeCurrentPeriodEnd: daysAgo(3),
        isGrandfathered: false,
      });

      const response = await GET(makeRequest());
      const data = await response.json();

      expect(data.winBack.sent).toBe(1);

      const sends = await prisma.emailSend.findMany({
        where: { userId: user.id },
      });
      expect(sends).toHaveLength(1);
      expect(sends[0].category).toBe("win-back");
      expect(sends[0].emailKey).toBe("winback.email1");
    });

    it("sends email 2 after 7 days", async () => {
      const user = await createTestUser({
        subscriptionStatus: "canceled",
        stripeCurrentPeriodEnd: daysAgo(7),
        isGrandfathered: false,
      });

      // Already sent email 1
      await prisma.emailSend.create({
        data: {
          userId: user.id,
          category: "win-back",
          emailKey: "winback.email1",
          sentAt: daysAgo(4),
        },
      });

      const response = await GET(makeRequest());
      const data = await response.json();

      expect(data.winBack.sent).toBe(1);

      const sends = await prisma.emailSend.findMany({
        where: { userId: user.id, emailKey: "winback.email2" },
      });
      expect(sends).toHaveLength(1);
    });

    it("sends email 3 after 14 days", async () => {
      const user = await createTestUser({
        subscriptionStatus: "canceled",
        stripeCurrentPeriodEnd: daysAgo(14),
        isGrandfathered: false,
      });

      // Already sent emails 1 and 2
      await prisma.emailSend.createMany({
        data: [
          {
            userId: user.id,
            category: "win-back",
            emailKey: "winback.email1",
            sentAt: daysAgo(11),
          },
          {
            userId: user.id,
            category: "win-back",
            emailKey: "winback.email2",
            sentAt: daysAgo(7),
          },
        ],
      });

      const response = await GET(makeRequest());
      const data = await response.json();

      expect(data.winBack.sent).toBe(1);

      const sends = await prisma.emailSend.findMany({
        where: { userId: user.id, emailKey: "winback.email3" },
      });
      expect(sends).toHaveLength(1);
    });

    it("does not send before 3 days", async () => {
      await createTestUser({
        subscriptionStatus: "canceled",
        stripeCurrentPeriodEnd: daysAgo(2),
        isGrandfathered: false,
      });

      const response = await GET(makeRequest());
      const data = await response.json();

      expect(data.winBack.sent).toBe(0);
    });

    it("stops after 3 emails", async () => {
      const user = await createTestUser({
        subscriptionStatus: "canceled",
        stripeCurrentPeriodEnd: daysAgo(30),
        isGrandfathered: false,
      });

      await prisma.emailSend.createMany({
        data: [
          {
            userId: user.id,
            category: "win-back",
            emailKey: "winback.email1",
            sentAt: daysAgo(27),
          },
          {
            userId: user.id,
            category: "win-back",
            emailKey: "winback.email2",
            sentAt: daysAgo(23),
          },
          {
            userId: user.id,
            category: "win-back",
            emailKey: "winback.email3",
            sentAt: daysAgo(16),
          },
        ],
      });

      const response = await GET(makeRequest());
      const data = await response.json();

      expect(data.winBack.sent).toBe(0);
    });

    it("skips secondary users", async () => {
      const primary = await createTestUser({
        subscriptionStatus: "active",
      });

      await createTestUser({
        subscriptionStatus: "canceled",
        stripeCurrentPeriodEnd: daysAgo(3),
        primaryUserId: primary.id,
        isGrandfathered: false,
      });

      const response = await GET(makeRequest());
      const data = await response.json();

      expect(data.winBack.sent).toBe(0);
    });

    it("skips grandfathered users", async () => {
      await createTestUser({
        subscriptionStatus: "canceled",
        stripeCurrentPeriodEnd: daysAgo(3),
        isGrandfathered: true,
      });

      const response = await GET(makeRequest());
      const data = await response.json();

      expect(data.winBack.sent).toBe(0);
    });

    it("skips unsubscribed users (EmailUnsubscribe for win-back)", async () => {
      const user = await createTestUser({
        subscriptionStatus: "canceled",
        stripeCurrentPeriodEnd: daysAgo(3),
        isGrandfathered: false,
      });

      await prisma.emailUnsubscribe.create({
        data: { userId: user.id, category: "win-back" },
      });

      const response = await GET(makeRequest());
      const data = await response.json();

      expect(data.winBack.sent).toBe(0);
    });

    it("skips users who resubscribed (subscriptionStatus != canceled)", async () => {
      await createTestUser({
        subscriptionStatus: "active",
        stripeCurrentPeriodEnd: daysAgo(3),
        isGrandfathered: false,
      });

      const response = await GET(makeRequest());
      const data = await response.json();

      expect(data.winBack.sent).toBe(0);
    });

    it("skips users without email", async () => {
      await createTestUser({
        email: null,
        subscriptionStatus: "canceled",
        stripeCurrentPeriodEnd: daysAgo(3),
        isGrandfathered: false,
      });

      const response = await GET(makeRequest());
      const data = await response.json();

      expect(data.winBack.processed).toBe(0);
      expect(data.winBack.sent).toBe(0);
    });

    it("does not send email 2 before 7 days even if email 1 was sent", async () => {
      const user = await createTestUser({
        subscriptionStatus: "canceled",
        stripeCurrentPeriodEnd: daysAgo(5),
        isGrandfathered: false,
      });

      await prisma.emailSend.create({
        data: {
          userId: user.id,
          category: "win-back",
          emailKey: "winback.email1",
          sentAt: daysAgo(2),
        },
      });

      const response = await GET(makeRequest());
      const data = await response.json();

      expect(data.winBack.sent).toBe(0);
    });

    it("is idempotent - running twice only sends once per email", async () => {
      await createTestUser({
        subscriptionStatus: "canceled",
        stripeCurrentPeriodEnd: daysAgo(3),
        isGrandfathered: false,
      });

      const response1 = await GET(makeRequest());
      const data1 = await response1.json();
      expect(data1.winBack.sent).toBe(1);

      const response2 = await GET(makeRequest());
      const data2 = await response2.json();
      // Still processed (user matches query) but email 2 not due yet
      expect(data2.winBack.sent).toBe(0);
    });

    it("processes multiple users independently", async () => {
      await createTestUser({
        subscriptionStatus: "canceled",
        stripeCurrentPeriodEnd: daysAgo(3),
        isGrandfathered: false,
      });

      await createTestUser({
        subscriptionStatus: "canceled",
        stripeCurrentPeriodEnd: daysAgo(7),
        isGrandfathered: false,
      });

      const response = await GET(makeRequest());
      const data = await response.json();

      // First user gets email 1, second user also gets email 1
      expect(data.winBack.processed).toBe(2);
      expect(data.winBack.sent).toBe(2);
    });
  });
});
