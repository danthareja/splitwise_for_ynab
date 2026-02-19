import type { NextRequest } from "next/server";
import { prisma } from "@/db";
import { sendOnboardingReminderEmail } from "@/services/email";
import { generateUnsubscribeToken } from "@/lib/unsubscribe";
import { getUserFirstName } from "@/lib/utils";

const DRIP_SCHEDULE_DAYS = [1, 3, 7];
const CATEGORY = "onboarding";

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

  const users = await prisma.user.findMany({
    where: {
      onboardingComplete: false,
      email: { not: null },
      emailUnsubscribes: {
        none: { category: CATEGORY },
      },
    },
    include: {
      emailSends: {
        where: { category: CATEGORY },
      },
    },
  });

  let processed = 0;
  let sent = 0;

  for (const user of users) {
    processed++;

    const step = user.onboardingStep;
    const referenceDate = user.onboardingStepReachedAt ?? user.createdAt;
    const daysSinceReference =
      (Date.now() - referenceDate.getTime()) / (1000 * 60 * 60 * 24);

    // Filter sends for current step
    const sendsForCurrentStep = user.emailSends.filter((s) =>
      s.emailKey.startsWith(`onboarding.step${step}.`),
    );

    // Already sent all 3 for this step
    if (sendsForCurrentStep.length >= 3) continue;

    const nextEmailNumber = sendsForCurrentStep.length + 1;
    const requiredDays = DRIP_SCHEDULE_DAYS[nextEmailNumber - 1] ?? 1;

    if (daysSinceReference < requiredDays) continue;

    // Skip step 4 emails for secondary users (they don't pay)
    if (step === 4 && !!user.primaryUserId) continue;

    const unsubscribeToken = generateUnsubscribeToken(user.id, CATEGORY);
    const unsubscribeUrl = `${baseUrl}/api/unsubscribe?token=${unsubscribeToken}`;

    try {
      await sendOnboardingReminderEmail({
        to: user.email!,
        userName: getUserFirstName(user) || undefined,
        step,
        emailNumber: nextEmailNumber,
        unsubscribeUrl,
      });

      await prisma.emailSend.create({
        data: {
          userId: user.id,
          category: CATEGORY,
          emailKey: `onboarding.step${step}.email${nextEmailNumber}`,
        },
      });

      sent++;
    } catch (error) {
      console.error(
        `Failed to send onboarding drip email to ${user.id}:`,
        error,
      );
    }
  }

  return Response.json({ success: true, processed, sent });
}
