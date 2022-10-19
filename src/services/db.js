import { Redis } from "@upstash/redis/with-fetch";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const ENV = process.env.VERCEL_ENV || "development";
const SERVER_KNOWLEDGE_KEY = `ynab:${ENV}:server_knowledge`;
const SPLITWISE_LAST_PROCESSED = `splitwise:${ENV}:last_processed`;

export async function setServerKnowledge(value) {
  await redis.set(SERVER_KNOWLEDGE_KEY, value);
  return value;
}

export async function getServerKnowledge() {
  const value = await redis.get(SERVER_KNOWLEDGE_KEY);
  return value;
}

export async function setSplitwiseLastProcessed(
  value = new Date().toISOString()
) {
  await redis.set(SPLITWISE_LAST_PROCESSED, value);
  return value;
}

export async function getSplitwiseLastProcessed() {
  const value = await redis.get(SPLITWISE_LAST_PROCESSED);
  return value;
}
