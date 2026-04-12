import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { episodes, translations } from "@/lib/db/schema";

export async function discardEpisodeTranslations(input: {
  episodeId: string;
  translationId?: string;
  modelName?: string;
}): Promise<{ deletedCount: number }> {
  const db = getDb();

  const conditions = [
    eq(translations.episodeId, input.episodeId),
    eq(translations.targetLanguage, "ko" as const),
  ];

  if (input.translationId) {
    conditions.push(eq(translations.id, input.translationId));
  }

  if (input.modelName) {
    conditions.push(eq(translations.modelName, input.modelName));
  }

  const deleted = await db
    .delete(translations)
    .where(and(...conditions))
    .returning({ id: translations.id });

  return {
    deletedCount: deleted.length,
  };
}

export async function discardNovelTranslations(input: {
  novelId: string;
  modelName?: string;
}): Promise<{ deletedCount: number }> {
  const db = getDb();

  const episodeRows = await db
    .select({ id: episodes.id })
    .from(episodes)
    .where(eq(episodes.novelId, input.novelId));

  const episodeIds = episodeRows.map((row) => row.id);

  if (episodeIds.length === 0) {
    return { deletedCount: 0 };
  }

  const conditions = [
    inArray(translations.episodeId, episodeIds),
    eq(translations.targetLanguage, "ko" as const),
  ];

  if (input.modelName) {
    conditions.push(eq(translations.modelName, input.modelName));
  }

  const deleted = await db
    .delete(translations)
    .where(and(...conditions))
    .returning({ id: translations.id });

  return {
    deletedCount: deleted.length,
  };
}
