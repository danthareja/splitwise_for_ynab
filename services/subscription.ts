import { prisma } from "@/db";
import type { User } from "@/prisma/generated/client";

/**
 * Subscription tiers
 */
export type SubscriptionTier = "free" | "premium";

/**
 * Subscription statuses
 */
export type SubscriptionStatus =
  | "free"
  | "active"
  | "canceled"
  | "past_due"
  | "trialing";

/**
 * Features that can be gated behind premium subscription
 */
export type PremiumFeature =
  | "automatic_sync"
  | "api_access"
  | "unlimited_syncs"
  | "extended_history"
  | "custom_split_ratio"
  | "custom_payee_name";

/**
 * Rate limit configuration for different tiers
 */
export interface RateLimitConfig {
  hourly: number;
  daily: number;
}

/**
 * Check if a user has an active premium subscription
 */
export async function isUserPremium(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionTier: true,
      subscriptionStatus: true,
      subscriptionCurrentPeriodEnd: true,
    },
  });

  if (!user) {
    return false;
  }

  // User is premium if:
  // 1. Tier is premium AND
  // 2. Status is active or trialing AND
  // 3. Period hasn't ended (or no period end set, for grandfathered users)
  return (
    user.subscriptionTier === "premium" &&
    (user.subscriptionStatus === "active" ||
      user.subscriptionStatus === "trialing") &&
    (!user.subscriptionCurrentPeriodEnd ||
      user.subscriptionCurrentPeriodEnd > new Date())
  );
}

/**
 * Check if a user can access a specific premium feature
 */
export async function canAccessFeature(
  userId: string,
  feature: PremiumFeature,
): Promise<boolean> {
  const isPremium = await isUserPremium(userId);

  // Map features to their access requirements
  const premiumOnlyFeatures: PremiumFeature[] = [
    "automatic_sync",
    "api_access",
    "unlimited_syncs",
    "extended_history",
    "custom_split_ratio",
    "custom_payee_name",
  ];

  if (premiumOnlyFeatures.includes(feature)) {
    return isPremium;
  }

  // Default to allowing access for any unrecognized features
  return true;
}

/**
 * Get rate limit configuration for a user based on their subscription tier
 */
export async function getRateLimitForUser(
  userId: string,
): Promise<RateLimitConfig> {
  const isPremium = await isUserPremium(userId);

  if (isPremium) {
    // Premium users: unlimited (represented by very high numbers)
    return {
      hourly: 999999,
      daily: 999999,
    };
  }

  // Free tier: 2 per hour, max 6 per day
  return {
    hourly: 2,
    daily: 6,
  };
}

/**
 * Get sync history retention limit (in days) for a user
 * Returns null for unlimited retention
 */
export async function getSyncHistoryLimit(
  userId: string,
): Promise<number | null> {
  const isPremium = await isUserPremium(userId);

  if (isPremium) {
    return null; // Unlimited history
  }

  return 7; // Free tier: 7 days
}

/**
 * Get user subscription info for display
 */
export async function getUserSubscriptionInfo(userId: string): Promise<{
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
  canceledAt: Date | null;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionTier: true,
      subscriptionStatus: true,
      subscriptionCurrentPeriodEnd: true,
      subscriptionCanceledAt: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return {
    tier: user.subscriptionTier as SubscriptionTier,
    status: user.subscriptionStatus as SubscriptionStatus,
    currentPeriodEnd: user.subscriptionCurrentPeriodEnd,
    canceledAt: user.subscriptionCanceledAt,
  };
}

/**
 * Update user subscription from Stripe data
 */
export async function updateUserSubscription(
  userId: string,
  data: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    subscriptionStatus?: SubscriptionStatus;
    subscriptionTier?: SubscriptionTier;
    subscriptionCurrentPeriodEnd?: Date;
    subscriptionCanceledAt?: Date | null;
  },
): Promise<User> {
  return prisma.user.update({
    where: { id: userId },
    data,
  });
}

/**
 * Find user by Stripe customer ID
 */
export async function getUserByStripeCustomerId(
  stripeCustomerId: string,
): Promise<User | null> {
  return prisma.user.findUnique({
    where: { stripeCustomerId },
  });
}

/**
 * Find user by Stripe subscription ID
 */
export async function getUserByStripeSubscriptionId(
  stripeSubscriptionId: string,
): Promise<User | null> {
  return prisma.user.findUnique({
    where: { stripeSubscriptionId },
  });
}
