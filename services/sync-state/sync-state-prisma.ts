import { prisma } from "@/db"
import type { SyncState } from "./sync-state"

export class PrismaSyncState implements SyncState {
  async getYNABServerKnowledge(userId: string): Promise<number | undefined> {
    const syncState = await prisma.syncState.findUnique({
      where: { userId },
    })

    return syncState?.ynabServerKnowledge ? Number(syncState.ynabServerKnowledge) : undefined
  }

  async setYNABServerKnowledge(userId: string, value: number): Promise<void> {
    await prisma.syncState.upsert({
      where: { userId },
      update: {
        ynabServerKnowledge: value.toString(),
        updatedAt: new Date(),
      },
      create: {
        userId,
        ynabServerKnowledge: value.toString(),
      },
    })
  }

  async getSplitwiseLastProcessed(userId: string): Promise<string | undefined> {
    // First try to get from SyncState
    const syncState = await prisma.syncState.findUnique({
      where: { userId },
    })

    if (syncState?.splitwiseLastSynced) {
      return syncState.splitwiseLastSynced.toISOString()
    }

    // Fallback to last successful sync
    const lastSuccessfulSync = await prisma.syncHistory.findFirst({
      where: {
        userId,
        status: "success",
        completedAt: { not: null },
      },
      orderBy: {
        completedAt: "desc",
      },
    })

    return lastSuccessfulSync?.completedAt?.toISOString()
  }

  async setSplitwiseLastProcessed(userId: string, value: string): Promise<void> {
    await prisma.syncState.upsert({
      where: { userId },
      update: {
        splitwiseLastSynced: new Date(value),
        updatedAt: new Date(),
      },
      create: {
        userId,
        splitwiseLastSynced: new Date(value),
      },
    })
  }
}
