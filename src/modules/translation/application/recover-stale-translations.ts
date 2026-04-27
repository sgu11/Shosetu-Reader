import { getDb } from "@/lib/db/client";
import { translations } from "@/lib/db/schema";
import { and, eq, lt, isNull, or } from "drizzle-orm";
import { logger } from "@/lib/logger";

// Standing-state recovery threshold. 10 min gives even chunked
// novellas room to finish but bails out promptly when a worker died
// mid-translation.
export const STALE_AFTER_MS = 10 * 60 * 1000;

// Worker-startup recovery uses a tighter window: anything that was
// 'processing' at the moment the worker came up is by definition
// abandoned (single-worker deployment). Set to 30s so a fast restart
// doesn't kill a request that genuinely just started.
export const STARTUP_STALE_AFTER_MS = 30 * 1000;

async function recoverWithCutoff(cutoff: Date, reason: string): Promise<number> {
  const db = getDb();
  const result = await db
    .update(translations)
    .set({
      status: "failed",
      errorCode: "STALE_RECOVERY",
      errorMessage: reason,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(translations.status, "processing"),
        or(
          isNull(translations.processingStartedAt),
          lt(translations.processingStartedAt, cutoff),
        ),
      ),
    )
    .returning({ id: translations.id });
  if (result.length > 0) {
    logger.warn("Recovered stale processing translations", {
      count: result.length,
      reason,
    });
  }
  return result.length;
}

export async function recoverStaleTranslations(): Promise<number> {
  return recoverWithCutoff(
    new Date(Date.now() - STALE_AFTER_MS),
    "Translation timed out — process likely crashed mid-flight",
  );
}

/**
 * Aggressive sweep run once at worker boot. Anything still in
 * 'processing' is from a worker that no longer exists.
 */
export async function recoverAbandonedTranslationsAtStartup(): Promise<number> {
  return recoverWithCutoff(
    new Date(Date.now() - STARTUP_STALE_AFTER_MS),
    "Worker restarted — translation abandoned",
  );
}
