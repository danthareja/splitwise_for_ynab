import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  createCheckoutSession,
  STRIPE_PRICE_ID_MONTHLY,
  STRIPE_PRICE_ID_YEARLY,
} from "@/services/stripe";

/**
 * POST /api/stripe/create-checkout-session
 * Creates a Stripe checkout session for subscription
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.email) {
      return NextResponse.json(
        { error: "Email is required for checkout" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { priceType } = body;

    // Validate price type
    if (priceType !== "monthly" && priceType !== "yearly") {
      return NextResponse.json(
        { error: "Invalid price type. Must be 'monthly' or 'yearly'" },
        { status: 400 },
      );
    }

    // Get the appropriate price ID
    const priceId =
      priceType === "monthly"
        ? STRIPE_PRICE_ID_MONTHLY
        : STRIPE_PRICE_ID_YEARLY;

    if (!priceId) {
      return NextResponse.json(
        { error: "Stripe price ID not configured" },
        { status: 500 },
      );
    }

    // Get base URL for redirects
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin;

    // Create checkout session
    const checkoutSession = await createCheckoutSession({
      userId: session.user.id,
      userEmail: session.user.email,
      priceId,
      successUrl: `${baseUrl}/dashboard?checkout=success`,
      cancelUrl: `${baseUrl}/dashboard?checkout=canceled`,
    });

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 },
    );
  }
}
