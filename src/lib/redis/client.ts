import { createClient, type RedisClientType } from "redis";
import { env } from "@/lib/env";

let sharedClient: RedisClientType | undefined;

export function isRedisConfigured() {
  return env.REDIS_URL.length > 0;
}

export async function getRedisClient() {
  if (!env.REDIS_URL) {
    throw new Error("REDIS_URL is not configured");
  }

  if (!sharedClient) {
    sharedClient = createClient({
      url: env.REDIS_URL,
    });
    sharedClient.on("error", () => {
      // Errors are handled by callers when operations fail.
    });
  }

  if (!sharedClient.isOpen) {
    await sharedClient.connect();
  }

  return sharedClient;
}

export async function createRedisConnection() {
  if (!env.REDIS_URL) {
    throw new Error("REDIS_URL is not configured");
  }

  const client = createClient({
    url: env.REDIS_URL,
  });
  await client.connect();
  return client;
}
