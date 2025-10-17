"use server";

import { auth } from "@/auth";
import * as Sentry from "@sentry/nextjs";
import { syncUserData } from "@/services/sync";
import { revalidatePath } from "next/cache";
import { prisma } from "@/db"; // Declare the prisma variable
import { enforcePerUserRateLimit } from "@/services/rate-limit";
import { getRateLimitOptionsForUser } from "@/lib/rate-limit";
import { Prisma } from "@/prisma/generated/client";
import { isUserFullyConfigured } from "./db";
import { isUserPremium } from "@/services/subscription";

export async function syncUserDataAction() {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      error: "You must be logged in to sync data",
    };
  }

  const isFullyConfigured = await isUserFullyConfigured(session.user.id);
  if (!isFullyConfigured) {
    return {
      success: false,
      error:
        "You must complete your Splitwise and YNAB configuration before syncing",
    };
  }

  if (session.user.disabled) {
    return {
      success: false,
      error:
        session.user.suggestedFix ||
        session.user.disabledReason ||
        "Your account has been disabled",
    };
  }

  try {
    // Get subscription-aware rate limits (use session data - no DB query!)
    const rateLimits = await getRateLimitOptionsForUser(session.user);
    const isPremium = isUserPremium(session.user);

    // Check hourly limit
    const hourlyCheck = await enforcePerUserRateLimit(
      session.user.id,
      rateLimits.hourly,
    );

    if (!hourlyCheck.allowed) {
      const upgradeMessage = isPremium
        ? ""
        : " Upgrade to Premium for unlimited syncs.";
      return {
        success: false,
        error: `You've reached your hourly sync limit (${rateLimits.hourly.maxRequests} per hour). Try again in ${Math.ceil(hourlyCheck.retryAfterSeconds / 60)} minutes.${upgradeMessage}`,
      } as const;
    }

    // Check daily limit
    const dailyCheck = await enforcePerUserRateLimit(
      session.user.id,
      rateLimits.daily,
    );

    if (!dailyCheck.allowed) {
      const upgradeMessage = isPremium
        ? ""
        : " Upgrade to Premium for unlimited syncs.";
      return {
        success: false,
        error: `You've reached your daily sync limit (${rateLimits.daily.maxRequests} per day). Try again in ${Math.ceil(dailyCheck.retryAfterSeconds / 3600)} hours.${upgradeMessage}`,
      } as const;
    }

    const result = await syncUserData(session.user.id);

    // Revalidate the dashboard page to show updated sync status
    revalidatePath("/dashboard");

    return result;
  } catch (error) {
    console.error("Sync action error:", error);
    Sentry.captureException(error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getSyncHistory(limit?: number) {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      error: "You must be logged in to view sync history",
    };
  }

  try {
    // Get subscription-aware history limit if not specified (use session data - no DB query!)
    const isPremium = isUserPremium(session.user);
    const historyLimit = limit ?? (isPremium ? undefined : 7); // Premium: unlimited (undefined = no limit), Free: 7 days

    const syncHistory = (await prisma.syncHistory.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        syncedItems: true,
      },
      orderBy: {
        startedAt: "desc",
      },
      ...(historyLimit !== undefined && { take: historyLimit }),
    })) as Prisma.SyncHistoryGetPayload<{
      include: { syncedItems: true };
    }>[];

    // sort syncedItems by date
    syncHistory.forEach((sync) => {
      sync.syncedItems.sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
    });

    return {
      success: true,
      syncHistory,
    };
  } catch (error) {
    console.error("Get sync history error:", error);
    Sentry.captureException(error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
