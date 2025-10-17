import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/services/stripe";
import { prisma } from "@/db";
import { updateUserSubscription } from "@/services/subscription";
import Stripe from "stripe";

/**
 * POST /api/stripe/webhooks
 * Handles Stripe webhook events
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 },
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Check for duplicate events (idempotency)
  const existingEvent = await prisma.stripeEvent.findUnique({
    where: { eventId: event.id },
  });

  if (existingEvent?.processed) {
    console.log(`Event ${event.id} already processed, skipping`);
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Store the event
  await prisma.stripeEvent.upsert({
    where: { eventId: event.id },
    create: {
      eventId: event.id,
      type: event.type,
      data: JSON.stringify(event.data),
      processed: false,
    },
    update: {},
  });

  try {
    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Mark event as processed
    await prisma.stripeEvent.update({
      where: { eventId: event.id },
      data: {
        processed: true,
        processedAt: new Date(),
      },
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`Error handling webhook event ${event.id}:`, error);
    // Don't mark as processed if there was an error
    return NextResponse.json(
      { error: "Error processing webhook" },
      { status: 500 },
    );
  }
}

/**
 * Handle checkout.session.completed event
 */
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
) {
  console.log("Checkout session completed:", session.id);

  const userId = session.metadata?.userId;
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!userId) {
    console.error("No userId in session metadata");
    return;
  }

  // Get subscription details
  const subscription = (await stripe.subscriptions.retrieve(
    subscriptionId,
  )) as Stripe.Subscription;

  const updateData: any = {
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    subscriptionStatus: subscription.status,
    subscriptionTier: "premium",
  };

  // Only set period end if it exists
  const currentPeriodEnd = subscription.current_period_end;
  if (currentPeriodEnd) {
    updateData.subscriptionCurrentPeriodEnd = new Date(currentPeriodEnd * 1000);
  }

  await updateUserSubscription(userId, updateData);

  console.log(`User ${userId} subscribed successfully`);
}

/**
 * Handle customer.subscription.updated event
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log("Subscription updated:", subscription.id);

  const userId = subscription.metadata?.userId;

  // Prepare update data with safety checks
  const updateData: any = {
    subscriptionStatus: subscription.status,
  };

  // Only set period end if it exists
  const currentPeriodEnd = subscription.current_period_end;
  if (currentPeriodEnd) {
    updateData.subscriptionCurrentPeriodEnd = new Date(currentPeriodEnd * 1000);
  }

  // Only set cancel date if it exists
  const cancelAt = subscription.cancel_at;
  if (cancelAt !== undefined) {
    updateData.subscriptionCanceledAt = cancelAt
      ? new Date(cancelAt * 1000)
      : null;
  }

  if (!userId) {
    // Try to find user by subscription ID
    const user = await prisma.user.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!user) {
      console.error("No user found for subscription:", subscription.id);
      return;
    }

    await updateUserSubscription(user.id, updateData);
  } else {
    await updateUserSubscription(userId, updateData);
  }

  console.log(`Subscription ${subscription.id} updated`);
}

/**
 * Handle customer.subscription.deleted event
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log("Subscription deleted:", subscription.id);

  const user = await prisma.user.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!user) {
    console.error("No user found for subscription:", subscription.id);
    return;
  }

  await updateUserSubscription(user.id, {
    subscriptionStatus: "canceled",
    subscriptionTier: "free",
    subscriptionCanceledAt: new Date(),
  });

  console.log(`User ${user.id} subscription canceled`);
}

/**
 * Handle invoice.payment_succeeded event
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log("Invoice payment succeeded:", invoice.id);

  const subscriptionId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription?.id;
  if (!subscriptionId) {
    return;
  }

  const subscription = (await stripe.subscriptions.retrieve(
    subscriptionId,
  )) as Stripe.Subscription;
  const user = await prisma.user.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (!user) {
    console.error("No user found for subscription:", subscriptionId);
    return;
  }

  const updateData: any = {
    subscriptionStatus: subscription.status,
  };

  // Only set period end if it exists
  const currentPeriodEnd = subscription.current_period_end;
  if (currentPeriodEnd) {
    updateData.subscriptionCurrentPeriodEnd = new Date(currentPeriodEnd * 1000);
  }

  await updateUserSubscription(user.id, updateData);

  console.log(`Payment succeeded for user ${user.id}`);
}

/**
 * Handle invoice.payment_failed event
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log("Invoice payment failed:", invoice.id);

  const subscriptionId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription?.id;
  if (!subscriptionId) {
    return;
  }

  const user = await prisma.user.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (!user) {
    console.error("No user found for subscription:", subscriptionId);
    return;
  }

  await updateUserSubscription(user.id, {
    subscriptionStatus: "past_due",
  });

  console.log(`Payment failed for user ${user.id}`);
}
