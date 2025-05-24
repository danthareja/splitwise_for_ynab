import { promises as fs } from "fs";
import path from "path";
import type { SyncState } from "./sync-state";

interface FilesystemSyncData {
  ynabServerKnowledge?: number;
  splitwiseLastProcessed?: string;
  updatedAt?: string;
}

export class FilesystemSyncState implements SyncState {
  private basePath: string;

  constructor(basePath?: string) {
    // Default to a .sync-state directory in the current working directory
    this.basePath = basePath || path.join(process.cwd(), ".sync-state");
  }

  private getUserFilePath(userId: string): string {
    return path.join(this.basePath, `${userId}.json`);
  }

  private async ensureDirectoryExists(): Promise<void> {
    try {
      await fs.access(this.basePath);
    } catch {
      await fs.mkdir(this.basePath, { recursive: true });
    }
  }

  private async readUserData(userId: string): Promise<FilesystemSyncData> {
    try {
      const filePath = this.getUserFilePath(userId);
      const data = await fs.readFile(filePath, "utf-8");
      return JSON.parse(data);
    } catch {
      // File doesn't exist or invalid JSON, return empty object
      return {};
    }
  }

  private async writeUserData(
    userId: string,
    data: FilesystemSyncData,
  ): Promise<void> {
    await this.ensureDirectoryExists();
    const filePath = this.getUserFilePath(userId);
    const dataWithTimestamp = {
      ...data,
      updatedAt: new Date().toISOString(),
    };
    await fs.writeFile(
      filePath,
      JSON.stringify(dataWithTimestamp, null, 2),
      "utf-8",
    );
  }

  async getYNABServerKnowledge(userId: string): Promise<number | undefined> {
    const data = await this.readUserData(userId);
    return data.ynabServerKnowledge;
  }

  async setYNABServerKnowledge(userId: string, value: number): Promise<void> {
    const existingData = await this.readUserData(userId);
    await this.writeUserData(userId, {
      ...existingData,
      ynabServerKnowledge: value,
    });
  }

  async getSplitwiseLastProcessed(userId: string): Promise<string | undefined> {
    const data = await this.readUserData(userId);
    return data.splitwiseLastProcessed;
  }

  async setSplitwiseLastProcessed(
    userId: string,
    value: string,
  ): Promise<void> {
    const existingData = await this.readUserData(userId);
    await this.writeUserData(userId, {
      ...existingData,
      splitwiseLastProcessed: value,
    });
  }
}
