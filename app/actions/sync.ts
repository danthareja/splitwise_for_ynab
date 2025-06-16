"use server";

import { auth } from "@/auth";
import * as Sentry from "@sentry/nextjs";
import { syncUserData } from "@/services/sync";
import { revalidatePath } from "next/cache";
import { prisma } from "@/db"; // Declare the prisma variable

export async function syncUserDataAction() {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      error: "You must be logged in to sync data",
    };
  }

  try {
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
    const syncHistory = await prisma.syncHistory.findMany({
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
    });

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
