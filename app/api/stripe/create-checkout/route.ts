import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createCheckoutSession } from "@/services/stripe";
import { prisma } from "@/db";
import type { PricingInterval } from "@/lib/stripe-pricing";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { interval, currencyCode, successUrl, cancelUrl } = body;

  if (!interval || !successUrl || !cancelUrl) {
    return NextResponse.json(
      { error: "Missing required fields: interval, successUrl, cancelUrl" },
      { status: 400 },
    );
  }

  // Validate interval
  if (interval !== "month" && interval !== "year") {
    return NextResponse.json(
      { error: "Invalid interval. Must be 'month' or 'year'" },
      { status: 400 },
    );
  }

  // Get user name
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true },
  });

  const checkoutSession = await createCheckoutSession({
    userId: session.user.id,
    email: session.user.email,
    name: user?.name,
    interval: interval as PricingInterval,
    currencyCode: currencyCode || undefined,
    successUrl,
    cancelUrl,
  });

  return NextResponse.json({
    url: checkoutSession.url,
    sessionId: checkoutSession.id,
  });
}
