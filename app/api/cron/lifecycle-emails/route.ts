import type { NextRequest } from "next/server";
import { prisma } from "@/db";
import { sendTrialMidpointEmail, sendWinBackEmail } from "@/services/email";
import { generateUnsubscribeToken } from "@/lib/unsubscribe";
import { getUserFirstName } from "@/lib/utils";
import { TRIAL_DAYS } from "@/lib/stripe-pricing";

const WINBACK_SCHEDULE_DAYS = [3, 7, 14];
const WINBACK_MIN_GAP_DAYS = 2;

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return Response.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const token = authHeader.slice("Bearer ".length).trim();

  if (token !== process.env.CRON_SECRET) {
    return Response.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  let trialMidpointResult: { processed: number; sent: number; error?: string } =
    { processed: 0, sent: 0 };
  let winBackResult: { processed: number; sent: number; error?: string } = {
    processed: 0,
    sent: 0,
  };

  try {
    trialMidpointResult = await processTrialMidpoint();
  } catch (error) {
    console.error("Failed to process trial midpoint emails:", error);
    trialMidpointResult.error = String(error);
  }

  try {
    winBackResult = await processWinBack();
  } catch (error) {
    console.error("Failed to process win-back emails:", error);
    winBackResult.error = String(error);
  }

  const success = !trialMidpointResult.error && !winBackResult.error;

  return Response.json(
    {
      success,
      trialMidpoint: trialMidpointResult,
      winBack: winBackResult,
    },
    { status: success ? 200 : 500 },
  );
}

async function processTrialMidpoint() {
  let processed = 0;
  let sent = 0;

  const users = await prisma.user.findMany({
    where: {
      subscriptionStatus: "trialing",
      trialEndsAt: { not: null },
      email: { not: null },
      emailUnsubscribes: {
        none: { category: "trial" },
      },
      emailSends: {
        none: { emailKey: "trial.midpoint" },
      },
    },
  });

  for (const user of users) {
    processed++;

    const daysLeft = Math.ceil(
      (user.trialEndsAt!.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );

    if (daysLeft > TRIAL_DAYS / 2) continue;

    // Get usage stats
    const syncCount = await prisma.syncHistory.count({
      where: {
        userId: user.id,
        status: { in: ["success", "partial"] },
      },
    });

    const transactionCount = await prisma.syncedItem.count({
      where: {
        syncHistory: { userId: user.id },
        status: "success",
      },
    });

    const unsubscribeToken = generateUnsubscribeToken(user.id, "trial");
    const unsubscribeUrl = `${baseUrl}/api/unsubscribe?token=${unsubscribeToken}`;

    try {
      await sendTrialMidpointEmail({
        to: user.email!,
        userName: getUserFirstName(user) || undefined,
        daysLeft,
        syncCount,
        transactionCount,
        unsubscribeUrl,
      });

      await prisma.emailSend.create({
        data: {
          userId: user.id,
          category: "trial",
          emailKey: "trial.midpoint",
        },
      });

      sent++;
    } catch (error) {
      console.error(
        `Failed to send trial midpoint email to ${user.id}:`,
        error,
      );
    }
  }

  return { processed, sent };
}

async function processWinBack() {
  let processed = 0;
  let sent = 0;

  const users = await prisma.user.findMany({
    where: {
      subscriptionStatus: "canceled",
      stripeCurrentPeriodEnd: { not: null },
      email: { not: null },
      primaryUserId: null,
      isGrandfathered: false,
      emailUnsubscribes: {
        none: { category: "win-back" },
      },
    },
    include: {
      emailSends: {
        where: { category: "win-back" },
      },
    },
  });

  for (const user of users) {
    processed++;

    const daysSinceEnd =
      (Date.now() - user.stripeCurrentPeriodEnd!.getTime()) /
      (1000 * 60 * 60 * 24);

    const sendCount = user.emailSends.length;

    // Already sent all 3 emails
    if (sendCount >= 3) continue;

    const nextEmailNumber = sendCount + 1;
    const requiredDays = WINBACK_SCHEDULE_DAYS[nextEmailNumber - 1] ?? Infinity;

    if (daysSinceEnd < requiredDays) continue;

    // Enforce minimum gap between emails to avoid bunching
    if (sendCount > 0) {
      const lastSend = user.emailSends.sort(
        (a, b) => b.sentAt.getTime() - a.sentAt.getTime(),
      )[0]!;
      const daysSinceLastSend =
        (Date.now() - lastSend.sentAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLastSend < WINBACK_MIN_GAP_DAYS) continue;
    }

    const unsubscribeToken = generateUnsubscribeToken(user.id, "win-back");
    const unsubscribeUrl = `${baseUrl}/api/unsubscribe?token=${unsubscribeToken}`;

    try {
      await sendWinBackEmail({
        to: user.email!,
        userName: getUserFirstName(user) || undefined,
        emailNumber: nextEmailNumber,
        unsubscribeUrl,
      });

      await prisma.emailSend.create({
        data: {
          userId: user.id,
          category: "win-back",
          emailKey: `winback.email${nextEmailNumber}`,
        },
      });

      sent++;
    } catch (error) {
      console.error(`Failed to send win-back email to ${user.id}:`, error);
    }
  }

  return { processed, sent };
}
