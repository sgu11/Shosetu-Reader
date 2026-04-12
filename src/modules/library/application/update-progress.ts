import { eq, and } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { readingProgress, episodes } from "@/lib/db/schema";
import { resolveUserId } from "@/modules/identity/application/resolve-user-context";
import type { UpdateProgressInput } from "../api/schemas";

export async function updateReadingProgress(
  input: UpdateProgressInput,
): Promise<void> {
  const userId = await resolveUserId();
  const db = getDb();

  // Look up the episode to get novelId
  const [episode] = await db
    .select({ id: episodes.id, novelId: episodes.novelId })
    .from(episodes)
    .where(eq(episodes.id, input.episodeId))
    .limit(1);

  if (!episode) {
    throw new Error("Episode not found");
  }

  const now = new Date();

  // Upsert reading progress
  const [existing] = await db
    .select({ id: readingProgress.id })
    .from(readingProgress)
    .where(
      and(
        eq(readingProgress.userId, userId),
        eq(readingProgress.novelId, episode.novelId),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(readingProgress)
      .set({
        currentEpisodeId: input.episodeId,
        currentLanguage: input.language,
        scrollAnchor: input.scrollAnchor ?? null,
        progressPercent: input.progressPercent ?? null,
        lastReadAt: now,
        updatedAt: now,
      })
      .where(eq(readingProgress.id, existing.id));
  } else {
    await db.insert(readingProgress).values({
      userId,
      novelId: episode.novelId,
      currentEpisodeId: input.episodeId,
      currentLanguage: input.language,
      scrollAnchor: input.scrollAnchor ?? null,
      progressPercent: input.progressPercent ?? null,
      lastReadAt: now,
    });
  }
}
