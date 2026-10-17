import { createClient, type RedisClientType } from "redis";
import { env } from "../config/env.js";

let client: RedisClientType | null = null;
let connectPromise: Promise<RedisClientType | null> | null = null;

export function isRedisConfigured(): boolean {
  return Boolean(env.REDIS_URL);
}

export async function getRedisClient(): Promise<RedisClientType | null> {
  if (!env.REDIS_URL) return null;
  if (client?.isOpen) return client;

  if (!connectPromise) {
    connectPromise = (async () => {
      const next = createClient({ url: env.REDIS_URL });
      next.on("error", (error) => {
        console.error("[redis] client error:", error);
      });
      await next.connect();
      client = next as RedisClientType;
      return client;
    })().catch((error) => {
      connectPromise = null;
      console.error("[redis] connect failed:", error);
      return null;
    });
  }

  return connectPromise;
}

export async function pingRedis(): Promise<boolean> {
  const redis = await getRedisClient();
  if (!redis) return false;
  try {
    const response = await redis.ping();
    return response === "PONG";
  } catch {
    return false;
  }
}
