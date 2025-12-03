"use server";

import { auth } from "@/auth";
import { prisma } from "@/db";
import { getSubscriptionStatus } from "@/services/stripe";

export type SubscriptionInfo = {
  hasSubscription: boolean;
  status: string | null;
  isTrialing: boolean;
  isActive: boolean;
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

  // Check if user is a secondary (has primaryUserId)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { primaryUserId: true },
  });

  // If secondary, get subscription from primary user
  const subscriptionUserId = user?.primaryUserId || session.user.id;
  const isSharedFromPrimary = !!user?.primaryUserId;

  const status = await getSubscriptionStatus(subscriptionUserId);

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
    daysUntilTrialEnd,
    daysUntilRenewal,
    isSharedFromPrimary,
  };
}

/**
 * Check if user can access the app (has active subscription or is in trial)
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
    },
  });

  if (!user) {
    return false;
  }

  // If onboarding is not complete, they can access (to complete it)
  if (!user.onboardingComplete) {
    return true;
  }

  // Check for active subscription or trial
  const status = user.subscriptionStatus;
  return status === "active" || status === "trialing";
}
