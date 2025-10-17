import Stripe from "stripe";

/**
 * Get Stripe secret key with fallback for test environment
 */
const getStripeSecretKey = (): string => {
  const key = process.env.STRIPE_SECRET_KEY;

  // In test environment, use a test key
  if (process.env.NODE_ENV === "test" || process.env.VITEST) {
    return key || "sk_test_mock_key";
  }

  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not defined in environment variables",
    );
  }

  return key;
};

/**
 * Server-side Stripe client
 * Only use this on the server side (API routes, server actions, etc.)
 */
export const stripe = new Stripe(getStripeSecretKey(), {
  apiVersion: "2024-11-20.acacia",
  typescript: true,
});

/**
 * Stripe price IDs from environment
 */
export const STRIPE_PRICE_ID_MONTHLY =
  process.env.STRIPE_PRICE_ID_MONTHLY || "";
export const STRIPE_PRICE_ID_YEARLY = process.env.STRIPE_PRICE_ID_YEARLY || "";

/**
 * Create a Stripe checkout session for a subscription
 */
export async function createCheckoutSession(params: {
  userId: string;
  userEmail: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<Stripe.Checkout.Session> {
  const { userId, userEmail, priceId, successUrl, cancelUrl } = params;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: userEmail,
    metadata: {
      userId,
    },
    subscription_data: {
      metadata: {
        userId,
      },
    },
    allow_promotion_codes: true,
  });

  return session;
}

/**
 * Create a Stripe billing portal session
 * Allows users to manage their subscription, payment methods, etc.
 */
export async function createPortalSession(params: {
  customerId: string;
  returnUrl: string;
}): Promise<Stripe.BillingPortal.Session> {
  const { customerId, returnUrl } = params;

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

/**
 * Get subscription by ID
 */
export async function getSubscription(
  subscriptionId: string,
): Promise<Stripe.Subscription | null> {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    console.error("Error retrieving subscription:", error);
    return null;
  }
}

/**
 * Cancel a subscription at period end
 */
export async function cancelSubscription(
  subscriptionId: string,
): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });

  return subscription;
}

/**
 * Reactivate a subscription that was set to cancel
 */
export async function reactivateSubscription(
  subscriptionId: string,
): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });

  return subscription;
}

/**
 * Get customer by ID
 */
export async function getCustomer(
  customerId: string,
): Promise<Stripe.Customer | null> {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) {
      return null;
    }
    return customer as Stripe.Customer;
  } catch (error) {
    console.error("Error retrieving customer:", error);
    return null;
  }
}
