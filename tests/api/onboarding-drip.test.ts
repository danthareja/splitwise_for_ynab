import { NextRequest } from "next/server";
import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/cron/onboarding-drip/route";
import { prisma } from "../setup";
import { createTestUser } from "../factories/test-data";

const CRON_SECRET = "test-cron-secret";

function makeRequest() {
  return new NextRequest("http://localhost/api/cron/onboarding-drip", {
    headers: { authorization: `Bearer ${CRON_SECRET}` },
  });
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

describe("/api/cron/onboarding-drip", () => {
  describe("Auth", () => {
    it("returns 401 without valid CRON_SECRET", async () => {
      const request = new NextRequest(
        "http://localhost/api/cron/onboarding-drip",
        {
          headers: { authorization: "Bearer wrong-secret" },
        },
      );
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("returns 401 without authorization header", async () => {
      const request = new NextRequest(
        "http://localhost/api/cron/onboarding-drip",
      );
      const response = await GET(request);
      expect(response.status).toBe(401);
    });
  });

  describe("Filtering", () => {
    it("skips completed users", async () => {
      await createTestUser({
        onboardingComplete: true,
        onboardingStep: 5,
        onboardingStepReachedAt: daysAgo(2),
      });

      const response = await GET(makeRequest());
      const data = await response.json();

      expect(data.processed).toBe(0);
      expect(data.sent).toBe(0);
    });

    it("skips users without email", async () => {
      await createTestUser({
        email: null,
        onboardingComplete: false,
        onboardingStep: 1,
        onboardingStepReachedAt: daysAgo(2),
      });

      const response = await GET(makeRequest());
      const data = await response.json();

      expect(data.processed).toBe(0);
      expect(data.sent).toBe(0);
    });

    it("skips users with ynab-generated placeholder emails", async () => {
      await createTestUser({
        email: "user-abc123@ynab-generated.com",
        onboardingComplete: false,
        onboardingStep: 1,
        onboardingStepReachedAt: daysAgo(2),
      });

      const response = await GET(makeRequest());
      const data = await response.json();

      expect(data.processed).toBe(0);
      expect(data.sent).toBe(0);
    });

    it("skips unsubscribed users", async () => {
      const user = await createTestUser({
        onboardingComplete: false,
        onboardingStep: 1,
        onboardingStepReachedAt: daysAgo(2),
      });

      await prisma.emailUnsubscribe.create({
        data: { userId: user.id, category: "onboarding" },
      });

      const response = await GET(makeRequest());
      const data = await response.json();

      expect(data.processed).toBe(0);
      expect(data.sent).toBe(0);
    });
  });

  describe("Email scheduling", () => {
    it("sends email 1 after 1 day", async () => {
      const user = await createTestUser({
        onboardingComplete: false,
        onboardingStep: 1,
        onboardingStepReachedAt: hoursAgo(25),
      });

      const response = await GET(makeRequest());
      const data = await response.json();

      expect(data.sent).toBe(1);

      const sends = await prisma.emailSend.findMany({
        where: { userId: user.id },
      });
      expect(sends).toHaveLength(1);
      expect(sends[0].category).toBe("onboarding");
      expect(sends[0].emailKey).toBe("onboarding.step1.email1");
    });

    it("does not send before 1 day", async () => {
      await createTestUser({
        onboardingComplete: false,
        onboardingStep: 1,
        onboardingStepReachedAt: hoursAgo(12),
      });

      const response = await GET(makeRequest());
      const data = await response.json();

      expect(data.sent).toBe(0);
    });

    it("sends email 2 after 3 days", async () => {
      const user = await createTestUser({
        onboardingComplete: false,
        onboardingStep: 1,
        onboardingStepReachedAt: daysAgo(4),
      });

      // Existing email 1 send
      await prisma.emailSend.create({
        data: {
          userId: user.id,
          category: "onboarding",
          emailKey: "onboarding.step1.email1",
          sentAt: daysAgo(3),
        },
      });

      const response = await GET(makeRequest());
      const data = await response.json();

      expect(data.sent).toBe(1);

      const sends = await prisma.emailSend.findMany({
        where: { userId: user.id },
        orderBy: { sentAt: "asc" },
      });
      expect(sends).toHaveLength(2);
      expect(sends[1].emailKey).toBe("onboarding.step1.email2");
    });

    it("sends email 3 after 7 days", async () => {
      const user = await createTestUser({
        onboardingComplete: false,
        onboardingStep: 1,
        onboardingStepReachedAt: daysAgo(8),
      });

      // Existing email 1 and 2 sends
      await prisma.emailSend.createMany({
        data: [
          {
            userId: user.id,
            category: "onboarding",
            emailKey: "onboarding.step1.email1",
            sentAt: daysAgo(7),
          },
          {
            userId: user.id,
            category: "onboarding",
            emailKey: "onboarding.step1.email2",
            sentAt: daysAgo(5),
          },
        ],
      });

      const response = await GET(makeRequest());
      const data = await response.json();

      expect(data.sent).toBe(1);

      const sends = await prisma.emailSend.findMany({
        where: { userId: user.id },
        orderBy: { sentAt: "asc" },
      });
      expect(sends).toHaveLength(3);
      expect(sends[2].emailKey).toBe("onboarding.step1.email3");
    });

    it("stops after 3 emails", async () => {
      const user = await createTestUser({
        onboardingComplete: false,
        onboardingStep: 1,
        onboardingStepReachedAt: daysAgo(14),
      });

      await prisma.emailSend.createMany({
        data: [
          {
            userId: user.id,
            category: "onboarding",
            emailKey: "onboarding.step1.email1",
            sentAt: daysAgo(13),
          },
          {
            userId: user.id,
            category: "onboarding",
            emailKey: "onboarding.step1.email2",
            sentAt: daysAgo(11),
          },
          {
            userId: user.id,
            category: "onboarding",
            emailKey: "onboarding.step1.email3",
            sentAt: daysAgo(7),
          },
        ],
      });

      const response = await GET(makeRequest());
      const data = await response.json();

      expect(data.sent).toBe(0);
    });

    it("resets on step change", async () => {
      const user = await createTestUser({
        onboardingComplete: false,
        onboardingStep: 2,
        onboardingStepReachedAt: daysAgo(2),
      });

      // 3 emails sent for step 1 (old step)
      await prisma.emailSend.createMany({
        data: [
          {
            userId: user.id,
            category: "onboarding",
            emailKey: "onboarding.step1.email1",
            sentAt: daysAgo(10),
          },
          {
            userId: user.id,
            category: "onboarding",
            emailKey: "onboarding.step1.email2",
            sentAt: daysAgo(8),
          },
          {
            userId: user.id,
            category: "onboarding",
            emailKey: "onboarding.step1.email3",
            sentAt: daysAgo(5),
          },
        ],
      });

      const response = await GET(makeRequest());
      const data = await response.json();

      expect(data.sent).toBe(1);

      const newSend = await prisma.emailSend.findFirst({
        where: {
          userId: user.id,
          emailKey: "onboarding.step2.email1",
        },
      });
      expect(newSend).toBeTruthy();
    });

    it("falls back to createdAt when onboardingStepReachedAt is null", async () => {
      await createTestUser({
        onboardingComplete: false,
        onboardingStep: 0,
        onboardingStepReachedAt: null,
        createdAt: hoursAgo(25),
      });

      const response = await GET(makeRequest());
      const data = await response.json();

      expect(data.sent).toBe(1);
    });

    it("handles secondary users at step 2", async () => {
      // Create a primary user first
      const primary = await createTestUser({
        onboardingComplete: true,
        onboardingStep: 5,
      });

      // Create secondary user linked to primary
      const secondary = await createTestUser({
        onboardingComplete: false,
        onboardingStep: 2,
        onboardingStepReachedAt: daysAgo(2),
        primaryUserId: primary.id,
      });

      const response = await GET(makeRequest());
      const data = await response.json();

      // Should send step 2 email (not skip secondary)
      expect(data.sent).toBe(1);

      const send = await prisma.emailSend.findFirst({
        where: { userId: secondary.id },
      });
      expect(send!.emailKey).toBe("onboarding.step2.email1");
    });

    it("skips step 4 for secondary users", async () => {
      const primary = await createTestUser({
        onboardingComplete: true,
        onboardingStep: 5,
      });

      await createTestUser({
        onboardingComplete: false,
        onboardingStep: 4,
        onboardingStepReachedAt: daysAgo(2),
        primaryUserId: primary.id,
      });

      const response = await GET(makeRequest());
      const data = await response.json();

      expect(data.sent).toBe(0);
    });
  });
});
