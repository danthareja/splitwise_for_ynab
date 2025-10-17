import { loadStripe, Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null>;

/**
 * Get Stripe.js instance (client-side only)
 * Uses singleton pattern to avoid loading Stripe.js multiple times
 */
export const getStripe = (): Promise<Stripe | null> => {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    if (!publishableKey) {
      console.error(
        "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not defined in environment variables",
      );
      return Promise.resolve(null);
    }

    stripePromise = loadStripe(publishableKey);
  }

  return stripePromise;
};

/**
 * Redirect to Stripe checkout
 * Note: redirectToCheckout is legacy but still supported in Stripe.js
 * Modern approach would be to redirect directly to the checkout URL from the session
 */
export async function redirectToCheckout(sessionId: string): Promise<void> {
  const stripe = await getStripe();

  if (!stripe) {
    throw new Error("Stripe.js failed to load");
  }

  // Type assertion to handle legacy API
  const result = await (stripe as any).redirectToCheckout({
    sessionId,
  });

  if (result?.error) {
    throw result.error;
  }
}
