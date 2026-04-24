import { createRedisConnection, getRedisClient, isRedisConfigured } from "./client";

export async function publishToChannel(
  channel: string,
  payload: unknown,
): Promise<void> {
  if (!isRedisConfigured()) return;
  try {
    const client = await getRedisClient();
    await client.publish(channel, JSON.stringify(payload));
  } catch {
    // fire-and-forget; subscribers that miss the event will reconcile via polling fallback
  }
}

/**
 * Subscribe to a pub/sub channel with a dedicated Redis connection.
 * node-redis forbids .subscribe() on a shared client, so every subscriber
 * must hold its own socket. Callers MUST invoke the returned unsubscribe
 * function on teardown, otherwise connections leak (one per open tab).
 */
export async function subscribeToChannel(
  channel: string,
  onMessage: (msg: string) => void,
): Promise<() => Promise<void>> {
  const sub = await createRedisConnection();
  await sub.subscribe(channel, (message) => {
    onMessage(message);
  });
  return async () => {
    try {
      await sub.unsubscribe(channel);
    } catch {
      // ignore
    }
    try {
      await sub.quit();
    } catch {
      // ignore
    }
  };
}

export function episodeEventChannel(episodeId: string): string {
  return `shosetu:events:episode:${episodeId}`;
}
