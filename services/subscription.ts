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
 * Minimal user data needed for subscription checks (from session or DB)
 */
export interface UserSubscriptionData {
  subscriptionTier?: string | null;
  subscriptionStatus?: string | null;
  subscriptionCurrentPeriodEnd?: Date | null;
}

/**
 * Check if subscription data indicates premium status
 * This is the core logic used by all premium checks
 */
function checkIsPremium(userData: UserSubscriptionData): boolean {
  return (
    userData.subscriptionTier === "premium" &&
    (userData.subscriptionStatus === "active" ||
      userData.subscriptionStatus === "trialing") &&
    (!userData.subscriptionCurrentPeriodEnd ||
      userData.subscriptionCurrentPeriodEnd > new Date())
  );
}

/**
 * Check if a user has an active premium subscription
 * Overload: accepts userId (requires DB query)
 */
export async function isUserPremium(userId: string): Promise<boolean>;
/**
 * Check if a user has an active premium subscription
 * Overload: accepts user data (no DB query - use from session!)
 */
export function isUserPremium(userData: UserSubscriptionData): boolean;
/**
 * Implementation
 */
export function isUserPremium(
  userIdOrData: string | UserSubscriptionData,
): boolean | Promise<boolean> {
  // If it's a string, it's a userId - query DB
  if (typeof userIdOrData === "string") {
    return prisma.user
      .findUnique({
        where: { id: userIdOrData },
        select: {
          subscriptionTier: true,
          subscriptionStatus: true,
          subscriptionCurrentPeriodEnd: true,
        },
      })
      .then((user) => {
        if (!user) return false;
        return checkIsPremium(user);
      });
  }

  // Otherwise it's user data - check directly (fast!)
  return checkIsPremium(userIdOrData);
}

/**
 * Check if a user can access a specific premium feature
 * Overload: accepts userId (requires DB query)
 */
export async function canAccessFeature(
  userId: string,
  feature: PremiumFeature,
): Promise<boolean>;
/**
 * Check if a user can access a specific premium feature
 * Overload: accepts user data (no DB query - use from session!)
 */
export function canAccessFeature(
  userData: UserSubscriptionData,
  feature: PremiumFeature,
): boolean;
/**
 * Implementation
 */
export function canAccessFeature(
  userIdOrData: string | UserSubscriptionData,
  feature: PremiumFeature,
): boolean | Promise<boolean> {
  // Map features to their access requirements
  const premiumOnlyFeatures: PremiumFeature[] = [
    "automatic_sync",
    "api_access",
    "unlimited_syncs",
    "extended_history",
    "custom_split_ratio",
    "custom_payee_name",
  ];

  const checkFeature = (isPremium: boolean) => {
    if (premiumOnlyFeatures.includes(feature)) {
      return isPremium;
    }
    // Default to allowing access for any unrecognized features
    return true;
  };

  // If it's a string, check premium status with DB query
  if (typeof userIdOrData === "string") {
    return isUserPremium(userIdOrData).then(checkFeature);
  }

  // Otherwise use the provided data (fast!)
  return checkFeature(isUserPremium(userIdOrData));
}

/**
 * Get rate limit configuration for a user based on their subscription tier
 * Overload: accepts userId (requires DB query)
 */
export async function getRateLimitForUser(
  userId: string,
): Promise<RateLimitConfig>;
/**
 * Get rate limit configuration for a user based on their subscription tier
 * Overload: accepts user data (no DB query - use from session!)
 */
export function getRateLimitForUser(
  userData: UserSubscriptionData,
): RateLimitConfig;
/**
 * Implementation
 */
export function getRateLimitForUser(
  userIdOrData: string | UserSubscriptionData,
): RateLimitConfig | Promise<RateLimitConfig> {
  const getLimits = (isPremium: boolean): RateLimitConfig => {
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
  };

  // If it's a string, check premium status with DB query
  if (typeof userIdOrData === "string") {
    return isUserPremium(userIdOrData).then(getLimits);
  }

  // Otherwise use the provided data (fast!)
  return getLimits(isUserPremium(userIdOrData));
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
