import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { auth } from "@/auth";
import { reactivateSubscription } from "@/services/stripe";
import { prisma } from "@/db";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await reactivateSubscription(session.user.id);

    // Optimistically update our database so the UI refresh shows the correct state
    // (webhook will also update this with the correct state)
    await prisma.user.update({
      where: { id: session.user.id },
      data: { cancelAtPeriodEnd: false },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to reactivate subscription:", err);
    Sentry.captureException(err);
    return NextResponse.json(
      { error: "Failed to reactivate subscription" },
      { status: 500 },
    );
  }
}
