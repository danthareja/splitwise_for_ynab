import { Redis } from "@upstash/redis/with-fetch";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const env = process.env.VERCEL_ENV || "development";
const key = `ynab:${env}:server_knowledge`;

export async function setServerKnowledge(value) {
  await redis.set(key, value);
  return value;
}

export async function getServerKnowledge() {
  const value = await redis.get(key);
  return value;
}
