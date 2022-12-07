import { Redis } from "@upstash/redis/with-fetch";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const ENV = process.env.VERCEL_ENV || "development";

export class KeyValueStore {
  constructor(key) {
    this.key = `${key}:${ENV}`;
  }

  async get() {
    const value = await redis.get(this.key);
    return value;
  }

  async set(value) {
    await redis.set(this.key, value);
    return value;
  }
}
