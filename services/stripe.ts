import { stripe } from "@/lib/stripe";
import { getStripePriceId, type PricingInterval } from "@/lib/stripe-pricing";
import { prisma } from "@/db";
import type Stripe from "stripe";

/**
 * Get or create a Stripe customer for a user
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  name?: string | null,
): Promise<string> {
  // Check if user already has a Stripe customer ID
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (user?.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    name: name || undefined,
    metadata: {
      userId,
    },
  });

  // Save customer ID to user
  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

/**
 * Create a Stripe Checkout Session for subscription
 * Trial period is defined on the Price object in Stripe - no need to set here.
 * Stripe automatically handles trial eligibility (one trial per customer).
 */
export async function createCheckoutSession({
  userId,
  email,
  name,
  interval,
  currencyCode,
  successUrl,
  cancelUrl,
}: {
  userId: string;
  email: string;
  name?: string | null;
  interval: PricingInterval;
  currencyCode?: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<Stripe.Checkout.Session> {
  const customerId = await getOrCreateStripeCustomer(userId, email, name);
  const priceId = getStripePriceId(interval);

  if (!priceId) {
    throw new Error(`No Stripe price ID configured for ${interval}`);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    // Force the currency to match what was shown in onboarding
    // This ensures consistency between the pricing preview and checkout
    currency: currencyCode?.toLowerCase(),
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    subscription_data: {
      metadata: {
        userId,
      },
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
    },
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    customer_update: {
      address: "auto",
      name: "auto",
    },
  });

  return session;
}

/**
 * Update user's subscription data in the database
 */
export async function updateUserSubscription(
  userId: string,
  subscription: Stripe.Subscription,
): Promise<void> {
  // In Stripe SDK v20+, current_period_end lives on SubscriptionItem, not Subscription
  const item = subscription.items.data[0];
  const priceId =
    item?.price?.id || (typeof item?.price === "string" ? item?.price : null);

  // Webhook payloads may not include full item data, fetch if needed
  let periodEnd = item?.current_period_end;
  if (!periodEnd) {
    const fullSubscription = await stripe.subscriptions.retrieve(
      subscription.id,
    );
    periodEnd = fullSubscription.items.data[0]?.current_period_end;
  }

  // Build update data, only include valid dates
  const updateData: {
    stripeSubscriptionId: string;
    stripePriceId: string | null;
    subscriptionStatus: string;
    stripeCurrentPeriodEnd?: Date;
    trialEndsAt: Date | null;
    cancelAtPeriodEnd: boolean;
  } = {
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    subscriptionStatus: subscription.status,
    trialEndsAt: subscription.trial_end
      ? new Date(subscription.trial_end * 1000)
      : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };

  // Only set period end if it's a valid timestamp
  if (periodEnd && periodEnd > 0) {
    updateData.stripeCurrentPeriodEnd = new Date(periodEnd * 1000);
  }

  await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });
}

/**
 * Get a user's subscription status
 */
export async function getSubscriptionStatus(userId: string): Promise<{
  hasSubscription: boolean;
  status: string | null;
  isTrialing: boolean;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  isActive: boolean;
  renewalAmount: number | null;
  renewalCurrency: string | null;
  interval: "month" | "year" | null;
  hadPreviousSubscription: boolean;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      stripeSubscriptionId: true,
      stripeCustomerId: true,
      subscriptionStatus: true,
      trialEndsAt: true,
      stripeCurrentPeriodEnd: true,
      cancelAtPeriodEnd: true,
      stripePriceId: true,
    },
  });

  const hasSubscription = !!user?.stripeSubscriptionId;
  const status = user?.subscriptionStatus || null;
  const isTrialing = status === "trialing";
  const isActive = status === "active" || status === "trialing";

  // User has had a previous subscription if they have a Stripe customer ID or trial end date
  const hadPreviousSubscription = !!(
    user?.stripeCustomerId || user?.trialEndsAt
  );

  // Determine interval from price ID
  const annualPriceId = process.env.STRIPE_PRICE_ANNUAL;
  const interval: "month" | "year" | null = user?.stripePriceId
    ? user.stripePriceId === annualPriceId
      ? "year"
      : "month"
    : null;

  // Try to get upcoming invoice for renewal amount (includes discounts)
  let renewalAmount: number | null = null;
  let renewalCurrency: string | null = null;

  // Only fetch upcoming invoice for active subscriptions that aren't canceling
  if (
    user?.stripeCustomerId &&
    user?.stripeSubscriptionId &&
    hasSubscription &&
    isActive &&
    !user.cancelAtPeriodEnd
  ) {
    try {
      // Use createPreview (Stripe SDK v20+) to get the next invoice amount with discounts
      const upcomingInvoice = await stripe.invoices.createPreview({
        customer: user.stripeCustomerId,
        subscription: user.stripeSubscriptionId,
      });
      renewalAmount = upcomingInvoice.amount_due; // In cents/smallest currency unit
      renewalCurrency = upcomingInvoice.currency?.toUpperCase() || null;
    } catch {
      // Upcoming invoice might not exist (e.g., during trial or if no payment method)
      // Silently fail and leave as null
    }
  }

  return {
    hasSubscription,
    status,
    isTrialing,
    trialEndsAt: user?.trialEndsAt || null,
    currentPeriodEnd: user?.stripeCurrentPeriodEnd || null,
    cancelAtPeriodEnd: user?.cancelAtPeriodEnd || false,
    isActive,
    renewalAmount,
    renewalCurrency,
    interval,
    hadPreviousSubscription,
  };
}

/**
 * Create a Stripe Customer Portal session
 */
export async function createBillingPortalSession({
  userId,
  returnUrl,
}: {
  userId: string;
  returnUrl: string;
}): Promise<Stripe.BillingPortal.Session> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (!user?.stripeCustomerId) {
    throw new Error("User does not have a Stripe customer ID");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: returnUrl,
  });

  return session;
}

/**
 * Handle webhook: checkout session completed
 * This is called when a user completes the Stripe Checkout flow
 */
export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const userId = session.metadata?.userId;
  if (!userId) {
    console.error("No userId in checkout session metadata");
    return;
  }

  // Get the subscription from the session
  const subscriptionId = session.subscription;
  if (!subscriptionId || typeof subscriptionId !== "string") {
    console.error("No subscription ID in checkout session");
    return;
  }

  // Fetch full subscription details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // Update user with subscription info
  await updateUserSubscription(userId, subscription);
}

/**
 * Handle webhook: subscription created
 */
export async function handleSubscriptionCreated(
  subscription: Stripe.Subscription,
): Promise<void> {
  const userId = subscription.metadata.userId;
  if (!userId) {
    console.error("No userId in subscription metadata");
    return;
  }

  await updateUserSubscription(userId, subscription);
}

/**
 * Handle webhook: subscription updated
 */
export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
): Promise<void> {
  const userId = subscription.metadata.userId;
  if (!userId) {
    // Try to find user by subscription ID
    const user = await prisma.user.findFirst({
      where: { stripeSubscriptionId: subscription.id },
      select: { id: true },
    });
    if (user) {
      await updateUserSubscription(user.id, subscription);
    }
    return;
  }

  await updateUserSubscription(userId, subscription);
}

/**
 * Handle webhook: subscription deleted
 */
export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
): Promise<void> {
  // Find user by subscription ID
  const user = await prisma.user.findFirst({
    where: { stripeSubscriptionId: subscription.id },
    select: { id: true },
  });

  if (!user) {
    console.error("No user found for subscription", subscription.id);
    return;
  }

  // Get the period end from subscription items (Stripe SDK v20+)
  const periodEnd = subscription.items?.data[0]?.current_period_end;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionStatus: "canceled",
      stripeSubscriptionId: null,
      stripePriceId: null,
      // Preserve the period end date so we know when subscription expired
      ...(periodEnd && {
        stripeCurrentPeriodEnd: new Date(periodEnd * 1000),
      }),
    },
  });
}

/**
 * Handle webhook: invoice payment failed
 */
export async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
): Promise<void> {
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id;

  if (!customerId) return;

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });

  if (!user) return;

  await prisma.user.update({
    where: { id: user.id },
    data: { subscriptionStatus: "past_due" },
  });
}

/**
 * Handle webhook: trial will end (fires 3 days before trial ends)
 * Sends a reminder email to the user
 */
export async function handleTrialWillEnd(
  subscription: Stripe.Subscription,
): Promise<{
  userId: string | null;
  email: string | null;
  trialEnd: Date | null;
  planName: string;
  planPrice: string;
}> {
  // Find user by subscription ID or metadata
  const userId = subscription.metadata.userId;
  let user;

  if (userId) {
    user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, stripePriceId: true },
    });
  } else {
    user = await prisma.user.findFirst({
      where: { stripeSubscriptionId: subscription.id },
      select: { id: true, email: true, name: true, stripePriceId: true },
    });
  }

  if (!user || !user.email) {
    console.error(
      "No user found for trial_will_end subscription",
      subscription.id,
    );
    return {
      userId: null,
      email: null,
      trialEnd: null,
      planName: "Annual",
      planPrice: "$39/year",
    };
  }

  // Determine plan details from price
  const priceId = user.stripePriceId;
  const annualPriceId = process.env.STRIPE_PRICE_ANNUAL;
  const isAnnual = priceId === annualPriceId;

  const planName = isAnnual ? "Annual" : "Monthly";
  const planPrice = isAnnual ? "$39/year" : "$4.99/month";

  const trialEnd = subscription.trial_end
    ? new Date(subscription.trial_end * 1000)
    : null;

  return {
    userId: user.id,
    email: user.email,
    trialEnd,
    planName,
    planPrice,
  };
}
