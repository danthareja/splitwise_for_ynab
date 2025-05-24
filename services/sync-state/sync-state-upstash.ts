import { Redis } from "@upstash/redis";
import type { SyncState } from "./sync-state";

interface UpstashSyncData {
  ynabServerKnowledge?: number;
  splitwiseLastProcessed?: string;
  updatedAt?: string;
}

export class UpstashSyncState implements SyncState {
  private redis: Redis;
  private keyPrefix: string;

  constructor(url: string, token: string, keyPrefix = "sync-state") {
    this.redis = new Redis({
      url,
      token,
    });
    this.keyPrefix = keyPrefix;
  }

  private getUserKey(userId: string): string {
    return `${this.keyPrefix}:${userId}`;
  }

  private async getUserData(userId: string): Promise<UpstashSyncData> {
    const key = this.getUserKey(userId);
    const data = await this.redis.get<UpstashSyncData>(key);
    return data || {};
  }

  private async setUserData(
    userId: string,
    data: UpstashSyncData,
  ): Promise<void> {
    const key = this.getUserKey(userId);
    const dataWithTimestamp = {
      ...data,
      updatedAt: new Date().toISOString(),
    };
    await this.redis.set(key, dataWithTimestamp);
  }

  async getYNABServerKnowledge(userId: string): Promise<number | undefined> {
    const data = await this.getUserData(userId);
    return data.ynabServerKnowledge;
  }

  async setYNABServerKnowledge(userId: string, value: number): Promise<void> {
    const existingData = await this.getUserData(userId);
    await this.setUserData(userId, {
      ...existingData,
      ynabServerKnowledge: value,
    });
  }

  async getSplitwiseLastProcessed(userId: string): Promise<string | undefined> {
    const data = await this.getUserData(userId);
    return data.splitwiseLastProcessed;
  }

  async setSplitwiseLastProcessed(
    userId: string,
    value: string,
  ): Promise<void> {
    const existingData = await this.getUserData(userId);
    await this.setUserData(userId, {
      ...existingData,
      splitwiseLastProcessed: value,
    });
  }
}
