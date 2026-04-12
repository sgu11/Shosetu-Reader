import { eq, and, lt, gt, desc } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { episodes, novels, readingProgress, translations, translationSettings } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { translateTexts } from "@/lib/translate-cache";
import { resolveUserId } from "@/modules/identity/application/resolve-user-context";
import type { ReaderPayload } from "../api/schemas";

export async function getReaderPayload(
  episodeId: string,
): Promise<ReaderPayload | null> {
  const db = getDb();

  const [episode] = await db
    .select()
    .from(episodes)
    .where(eq(episodes.id, episodeId))
    .limit(1);

  if (!episode) return null;

  const [novel] = await db
    .select()
    .from(novels)
    .where(eq(novels.id, episode.novelId))
    .limit(1);

  if (!novel) return null;

  // Find prev/next episodes
  const [prevEpisode] = await db
    .select({ id: episodes.id })
    .from(episodes)
    .where(
      and(
        eq(episodes.novelId, episode.novelId),
        lt(episodes.episodeNumber, episode.episodeNumber),
      ),
    )
    .orderBy(desc(episodes.episodeNumber))
    .limit(1);

  const [nextEpisode] = await db
    .select({ id: episodes.id })
    .from(episodes)
    .where(
      and(
        eq(episodes.novelId, episode.novelId),
        gt(episodes.episodeNumber, episode.episodeNumber),
      ),
    )
    .orderBy(episodes.episodeNumber)
    .limit(1);

  // Get all Korean translations for this episode
  const allTranslations = await db
    .select()
    .from(translations)
    .where(
      and(
        eq(translations.episodeId, episodeId),
        eq(translations.targetLanguage, "ko"),
      ),
    )
    .orderBy(desc(translations.createdAt));

  // Keep an existing readable translation visible while a newer one is processing.
  const pendingTranslation = allTranslations.find(
    (r) => r.status === "queued" || r.status === "processing",
  ) ?? null;
  const latestAvailable = allTranslations.find((r) => r.status === "available") ?? null;
  const translation = latestAvailable ?? pendingTranslation ?? allTranslations[0] ?? null;

  // Get user's configured translation model
  const userId = await resolveUserId();
  const [settings] = await db
    .select({ modelName: translationSettings.modelName })
    .from(translationSettings)
    .where(eq(translationSettings.userId, userId))
    .limit(1);

  const configuredModel = settings?.modelName ?? env.OPENROUTER_DEFAULT_MODEL;

  // Translate episode title if it's not just a number
  let titleKo: string | null = null;
  if (episode.titleJa) {
    const cache = await translateTexts([episode.titleJa]);
    titleKo = cache.get(episode.titleJa) ?? null;
  }

  const [progressRow] = await db
    .select({
      currentEpisodeId: readingProgress.currentEpisodeId,
      currentLanguage: readingProgress.currentLanguage,
      scrollAnchor: readingProgress.scrollAnchor,
      progressPercent: readingProgress.progressPercent,
    })
    .from(readingProgress)
    .where(
      and(
        eq(readingProgress.userId, userId),
        eq(readingProgress.novelId, novel.id),
      ),
    )
    .limit(1);

  const progress = progressRow && progressRow.currentEpisodeId === episodeId
    ? {
        currentLanguage: progressRow.currentLanguage,
        scrollAnchor: progressRow.scrollAnchor,
        progressPercent: progressRow.progressPercent,
      }
    : null;

  return {
    novel: {
      id: novel.id,
      titleJa: novel.titleJa,
      titleNormalized: novel.titleNormalized,
      sourceNcode: novel.sourceNcode,
    },
    episode: {
      id: episode.id,
      episodeNumber: episode.episodeNumber,
      titleJa: episode.titleJa,
      titleKo,
      sourceTextJa: episode.normalizedTextJa,
    },
    translation: translation
      ? {
          status: translation.status,
          translatedText: translation.translatedText,
          provider: translation.provider,
          modelName: translation.modelName,
          errorMessage: translation.errorMessage,
        }
      : null,
    translations: allTranslations
      .filter((t) => t.status === "available")
      .map((t) => ({
        id: t.id,
        modelName: t.modelName,
        completedAt: t.completedAt?.toISOString() ?? null,
      })),
    pendingTranslation: pendingTranslation
      ? {
          status: pendingTranslation.status as "queued" | "processing",
          modelName: pendingTranslation.modelName,
        }
      : null,
    configuredModel,
    navigation: {
      prevEpisodeId: prevEpisode?.id ?? null,
      nextEpisodeId: nextEpisode?.id ?? null,
    },
    progress,
  };
}
