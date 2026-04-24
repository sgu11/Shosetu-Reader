import { NextRequest } from "next/server";
import { isValidUuid } from "@/lib/validation";
import { isRedisConfigured } from "@/lib/redis/client";
import {
  episodeEventChannel,
  subscribeToChannel,
} from "@/lib/redis/pubsub";
import { getTranslationStatus } from "@/modules/translation/application/get-translation-status";

const HEARTBEAT_INTERVAL_MS = 15_000;

export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ episodeId: string }>;
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const { episodeId } = await ctx.params;
  if (!isValidUuid(episodeId)) {
    return new Response("Invalid episode ID", { status: 400 });
  }
  if (!isRedisConfigured()) {
    return new Response("SSE requires Redis", { status: 503 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (type: string, data: unknown) => {
        if (closed) return;
        const payload = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
        try {
          controller.enqueue(encoder.encode(payload));
        } catch {
          closed = true;
        }
      };

      // Initial snapshot so the client doesn't need a separate fetch
      try {
        const snapshot = await getTranslationStatus(episodeId);
        send("snapshot", snapshot);
      } catch {
        // non-fatal
      }

      const channel = episodeEventChannel(episodeId);
      let unsubscribe: (() => Promise<void>) | null = null;
      try {
        unsubscribe = await subscribeToChannel(channel, (message) => {
          if (closed) return;
          try {
            const parsed = JSON.parse(message);
            const type = typeof parsed?.type === "string" ? parsed.type : "message";
            send(type, parsed);
          } catch {
            // drop malformed
          }
        });
      } catch {
        send("error", { message: "subscription-failed" });
        closed = true;
        controller.close();
        return;
      }

      const heartbeat = setInterval(() => {
        send("heartbeat", { at: new Date().toISOString() });
      }, HEARTBEAT_INTERVAL_MS);

      const cleanup = async () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        if (unsubscribe) {
          await unsubscribe();
          unsubscribe = null;
        }
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      req.signal.addEventListener("abort", () => {
        void cleanup();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
