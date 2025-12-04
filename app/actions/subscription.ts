"use server";

import { auth } from "@/auth";
import { prisma } from "@/db";
import { getSubscriptionStatus } from "@/services/stripe";

export type SubscriptionInfo = {
  hasSubscription: boolean;
  status: string | null;
  isTrialing: boolean;
  isActive: boolean;
  /** True if user is grandfathered (early adopter with lifetime free access) */
  isGrandfathered: boolean;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  daysUntilTrialEnd: number | null;
  daysUntilRenewal: number | null;
  /** True if this subscription belongs to the primary user (secondary users share it) */
  isSharedFromPrimary: boolean;
  /** Renewal amount in smallest currency unit (e.g., cents), includes discounts */
  renewalAmount: number | null;
  /** Currency code for renewal (e.g., "USD", "GBP") */
  renewalCurrency: string | null;
  /** Billing interval */
  interval: "month" | "year" | null;
  /** True if user has ever had a subscription or trial before (for re-subscribe vs start trial) */
  hadPreviousSubscription: boolean;
};

/**
 * Get the current user's subscription information
 * For secondary users in a dual setup, returns the primary user's subscription
 */
export async function getSubscriptionInfo(): Promise<SubscriptionInfo | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  // Check if user is a secondary (has primaryUserId) and get their own grandfathered status
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { primaryUserId: true, isGrandfathered: true },
  });

  // If secondary, get subscription from primary user (for billing purposes)
  // But grandfathered status is per-user, not inherited from primary
  const subscriptionUserId = user?.primaryUserId || session.user.id;
  const isSharedFromPrimary = !!user?.primaryUserId;

  const status = await getSubscriptionStatus(subscriptionUserId);

  // Use the current user's own grandfathered status (not primary's)
  const isGrandfathered = user?.isGrandfathered ?? false;

  // Calculate days until trial end
  let daysUntilTrialEnd: number | null = null;
  if (status.isTrialing && status.trialEndsAt) {
    const now = new Date();
    const diffMs = status.trialEndsAt.getTime() - now.getTime();
    daysUntilTrialEnd = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  // Calculate days until renewal
  let daysUntilRenewal: number | null = null;
  if (status.currentPeriodEnd) {
    const now = new Date();
    const diffMs = status.currentPeriodEnd.getTime() - now.getTime();
    daysUntilRenewal = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  return {
    ...status,
    // Override with current user's own grandfathered status
    isGrandfathered,
    // Also update isActive to reflect current user's grandfathered status
    isActive: status.isActive || isGrandfathered,
    daysUntilTrialEnd,
    daysUntilRenewal,
    isSharedFromPrimary,
  };
}

/**
 * Check if user can access the app (has active subscription, is in trial, or is grandfathered)
 */
export async function canAccessApp(): Promise<boolean> {
  const session = await auth();

  if (!session?.user?.id) {
    return false;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      subscriptionStatus: true,
      onboardingComplete: true,
      isGrandfathered: true,
    },
  });

  if (!user) {
    return false;
  }

  // If onboarding is not complete, they can access (to complete it)
  if (!user.onboardingComplete) {
    return true;
  }

  // Grandfathered users always have access
  if (user.isGrandfathered) {
    return true;
  }

  // Check for active subscription or trial
  const status = user.subscriptionStatus;
  return status === "active" || status === "trialing";
}
