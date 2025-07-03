export interface SyncState {
  getYNABServerKnowledge(userId: string): Promise<number | undefined>;
  setYNABServerKnowledge(userId: string, value: number): Promise<void>;
  getSplitwiseLastProcessed(userId: string): Promise<string | undefined>;
  setSplitwiseLastProcessed(userId: string, value: string): Promise<void>;
}

export interface SyncStateOptions {
  basePath?: string;
  keyPrefix?: string;
  url?: string;
  token?: string;
}

// Factory to create the appropriate sync state implementation
export class SyncStateFactory {
  static async create(
    strategy: "prisma" | "filesystem" = "prisma",
    options?: SyncStateOptions,
  ): Promise<SyncState> {
    switch (strategy) {
      case "filesystem":
        const { FilesystemSyncState } = await import("./sync-state-filesystem");
        return new FilesystemSyncState(options?.basePath);
      case "prisma":
      default:
        const { PrismaSyncState } = await import("./sync-state-prisma");
        return new PrismaSyncState();
    }
  }
}
