/**
 * Dry-run diagnostic script for the Brick House group (85871565).
 *
 * Read-only: no edits, no API writes.
 * Exposes stacked emojis on Splitwise expenses and duplicate synced items
 * so we can send an informed email to affected users.
 *
 * Usage:
 *   npx tsx scripts/diagnose-brick-house.ts
 *
 * Requires DATABASE_URL in .env (or .env.local).
 */

import { PrismaClient } from "@/prisma/generated/client";

const BRICK_HOUSE_GROUP_ID = "85871565";
const STACKED_EMOJI_REGEX = /^(✅){2,}/u;

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log("=== Brick House Diagnostic ===\n");

    // 1. Find users in this group
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { splitwiseSettings: { groupId: BRICK_HOUSE_GROUP_ID } },
          {
            primaryUser: {
              splitwiseSettings: { groupId: BRICK_HOUSE_GROUP_ID },
            },
          },
        ],
      },
      select: {
        id: true,
        email: true,
        splitwiseSettings: { select: { emoji: true } },
      },
    });

    console.log(`Users in group ${BRICK_HOUSE_GROUP_ID}:`);
    for (const u of users) {
      console.log(
        `  ${u.email || u.id} (emoji: ${u.splitwiseSettings?.emoji || "✅"})`,
      );
    }
    console.log();

    // 2. Find synced items that share the same expense ID (duplicates)
    const userIds = users.map((u) => u.id);

    // Get sync histories for these users, then their synced items
    const syncHistories = await prisma.syncHistory.findMany({
      where: { userId: { in: userIds } },
      select: { id: true, userId: true, startedAt: true },
      orderBy: { startedAt: "asc" },
    });

    const syncHistoryMap = new Map(syncHistories.map((sh) => [sh.id, sh]));

    const syncedItems = await prisma.syncedItem.findMany({
      where: {
        syncHistoryId: { in: syncHistories.map((sh) => sh.id) },
        direction: "splitwise_to_ynab",
      },
      orderBy: { id: "asc" },
    });

    // Group by externalId (splitwise expense ID) per user
    type SyncedItemWithHistory = (typeof syncedItems)[number] & {
      syncHistoryData: { userId: string; startedAt: Date };
    };
    const byUserAndExpense = new Map<string, SyncedItemWithHistory[]>();
    for (const item of syncedItems) {
      const sh = syncHistoryMap.get(item.syncHistoryId);
      if (!sh) continue;
      const enriched = {
        ...item,
        syncHistoryData: { userId: sh.userId, startedAt: sh.startedAt },
      };
      const key = `${sh.userId}:${item.externalId}`;
      if (!byUserAndExpense.has(key)) {
        byUserAndExpense.set(key, []);
      }
      byUserAndExpense.get(key)!.push(enriched);
    }

    let duplicateCount = 0;
    const duplicateExpenseIds = new Set<string>();

    console.log(
      "=== Duplicate Synced Items (same expense synced multiple times) ===\n",
    );
    for (const [key, items] of byUserAndExpense) {
      if (items.length > 1) {
        duplicateCount += items.length - 1; // excess copies
        const [userId, expenseId] = key.split(":");
        duplicateExpenseIds.add(expenseId!);
        const user = users.find((u) => u.id === userId);
        console.log(
          `  ${user?.email || userId} - Expense ${expenseId}: ${items.length} copies`,
        );
        for (const item of items) {
          console.log(
            `    ${item.id} | ${item.description} | $${item.amount} | ${item.status} | ${item.syncHistoryData.startedAt.toISOString()}`,
          );
        }
      }
    }

    if (duplicateCount === 0) {
      console.log("  (none found)\n");
    } else {
      console.log(
        `\nTotal: ${duplicateCount} duplicate synced items across ${duplicateExpenseIds.size} expenses\n`,
      );
    }

    // 3. Check stale pending sync histories
    const stalePending = await prisma.syncHistory.findMany({
      where: {
        userId: { in: userIds },
        status: "pending",
      },
      orderBy: { startedAt: "desc" },
    });

    console.log("=== Stale Pending Sync Histories ===\n");
    if (stalePending.length === 0) {
      console.log("  (none)\n");
    } else {
      for (const sh of stalePending) {
        const user = users.find((u) => u.id === sh.userId);
        console.log(
          `  ${user?.email || sh.userId} | ${sh.id} | started ${sh.startedAt.toISOString()}`,
        );
      }
      console.log();
    }

    // 4. Summary of error sync histories (recent)
    const recentErrors = await prisma.syncHistory.findMany({
      where: {
        userId: { in: userIds },
        status: "error",
        startedAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) }, // last 14 days
      },
      orderBy: { startedAt: "desc" },
    });

    console.log("=== Recent Error Sync Histories (last 14 days) ===\n");
    if (recentErrors.length === 0) {
      console.log("  (none)\n");
    } else {
      for (const sh of recentErrors) {
        const user = users.find((u) => u.id === sh.userId);
        console.log(
          `  ${user?.email || sh.userId} | ${sh.startedAt.toISOString()} | ${sh.errorMessage}`,
        );
      }
      console.log();
    }

    console.log("=== Summary ===");
    console.log(`Users in group: ${users.length}`);
    console.log(`Duplicate synced items: ${duplicateCount}`);
    console.log(`Unique expenses with duplicates: ${duplicateExpenseIds.size}`);
    console.log(`Stale pending syncs: ${stalePending.length}`);
    console.log(`Recent error syncs: ${recentErrors.length}`);
    console.log(
      "\nNote: Stacked emojis on Splitwise descriptions can only be checked via the Splitwise API.",
    );
    console.log(
      "The emoji fix in markExpenseProcessed will clean them up on the next successful sync.",
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
