"use server";

import { auth } from "@/auth";
import * as Sentry from "@sentry/nextjs";
import { syncUserData } from "@/services/sync";
import { revalidatePath } from "next/cache";
import { prisma } from "@/db"; // Declare the prisma variable
import { enforcePerUserRateLimit } from "@/services/rate-limit";
import { getRateLimitOptions } from "@/lib/rate-limit";
import { Prisma } from "@/prisma/generated/client";
import { isUserFullyConfigured } from "./db";

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
    // Rate-limit manual syncs the same as API
    const rateLimitOpts = getRateLimitOptions();
    const { allowed, retryAfterSeconds } = await enforcePerUserRateLimit(
      session.user.id,
      rateLimitOpts,
    );

    if (!allowed) {
      return {
        success: false,
        error: `You can trigger at most ${rateLimitOpts.maxRequests} manual syncs every ${rateLimitOpts.windowSeconds / 60} minutes. Try again in ${Math.ceil(retryAfterSeconds / 60)} minutes`,
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

export async function getSyncHistory(limit = 7) {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      error: "You must be logged in to view sync history",
    };
  }

  try {
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
      take: limit,
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
