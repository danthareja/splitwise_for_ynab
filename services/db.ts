import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const ENV = process.env.VERCEL_ENV || "development";

export class KeyValueStore {
  private key: string;
  constructor(key: string) {
    this.key = `${key}:${ENV}`;
  }

  async get(): Promise<any> {
    const value = await redis.get(this.key);
    return value;
  }

  async set(value: any): Promise<any> {
    await redis.set(this.key, value);
    return value;
  }
}
