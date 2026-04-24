import { getDb } from "@/lib/db/client";
import { translations } from "@/lib/db/schema";
import { and, eq, lt } from "drizzle-orm";
import { logger } from "@/lib/logger";

const STALE_AFTER_MS = 30 * 60 * 1000;

export async function recoverStaleTranslations(): Promise<number> {
  const db = getDb();
  const cutoff = new Date(Date.now() - STALE_AFTER_MS);
  const result = await db
    .update(translations)
    .set({
      status: "failed",
      errorCode: "STALE_RECOVERY",
      errorMessage: "Translation timed out — process likely crashed mid-flight",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(translations.status, "processing"),
        lt(translations.processingStartedAt, cutoff),
      ),
    )
    .returning({ id: translations.id });
  if (result.length > 0) {
    logger.warn("Recovered stale processing translations", {
      count: result.length,
    });
  }
  return result.length;
}
