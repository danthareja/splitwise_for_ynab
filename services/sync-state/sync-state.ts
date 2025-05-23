// TODO: re-think if we can lazy load, so that we don't have to import prisma right away
import { PrismaSyncState } from "./sync-state-prisma"

export interface SyncState {
  getYNABServerKnowledge(userId: string): Promise<number | undefined>
  setYNABServerKnowledge(userId: string, value: number): Promise<void>
  getSplitwiseLastProcessed(userId: string): Promise<string | undefined>
  setSplitwiseLastProcessed(userId: string, value: string): Promise<void>
}

// Factory to create the appropriate sync state implementation
export class SyncStateFactory {
  static create(strategy: "prisma" = "prisma"): SyncState {
    switch (strategy) {
      // TODO: Add more adapters as needed
      case "prisma":
      default:
        return new PrismaSyncState()
    }
  }
}
