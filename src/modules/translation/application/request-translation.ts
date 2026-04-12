import { eq, and } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { episodes, translations, translationSettings, novelTranslationPrompts, novelGlossaries } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { resolveUserId } from "@/modules/identity/application/resolve-user-context";
import { OpenRouterProvider } from "../infra/openrouter-provider";
import { estimateCost } from "./cost-estimation";

const PROMPT_VERSION = "v2";

/**
 * Load user's translation settings (model + global prompt) and per-novel prompt.
 */
async function loadTranslationContext(novelId: string) {
  const db = getDb();
  const userId = await resolveUserId();

  const [settings] = await db
    .select({
      modelName: translationSettings.modelName,
      globalPrompt: translationSettings.globalPrompt,
    })
    .from(translationSettings)
    .where(eq(translationSettings.userId, userId))
    .limit(1);

  const [novelPrompt] = await db
    .select({ prompt: novelTranslationPrompts.prompt })
    .from(novelTranslationPrompts)
    .where(
      and(
        eq(novelTranslationPrompts.novelId, novelId),
        eq(novelTranslationPrompts.userId, userId),
      ),
    )
    .limit(1);

  const [glossaryRow] = await db
    .select({ glossary: novelGlossaries.glossary })
    .from(novelGlossaries)
    .where(eq(novelGlossaries.novelId, novelId))
    .limit(1);

  return {
    modelName: settings?.modelName ?? env.OPENROUTER_DEFAULT_MODEL,
    globalPrompt: settings?.globalPrompt ?? "",
    novelPrompt: novelPrompt?.prompt ?? "",
    glossary: glossaryRow?.glossary ?? "",
  };
}

/**
 * Request a Korean translation for an episode.
 * If a translation already exists with the same identity, returns it.
 * Otherwise, creates a queued row and immediately processes it.
 */
export async function requestTranslation(
  episodeId: string,
  modelOverride?: string,
): Promise<{ translationId: string; status: string }> {
  const db = getDb();

  // Fetch episode
  const [episode] = await db
    .select()
    .from(episodes)
    .where(eq(episodes.id, episodeId))
    .limit(1);

  if (!episode) {
    throw new Error("Episode not found");
  }

  if (!episode.normalizedTextJa) {
    throw new Error("Episode has no source text to translate");
  }

  const sourceChecksum = episode.rawHtmlChecksum ?? "unknown";

  // Load translation context (model, global prompt, novel prompt)
  const ctx = await loadTranslationContext(episode.novelId);

  const provider = new OpenRouterProvider(
    env.OPENROUTER_API_KEY ?? "",
    modelOverride ?? ctx.modelName,
    ctx.globalPrompt,
    ctx.novelPrompt,
    ctx.glossary,
  );

  // Check for existing translation with same identity
  const [existing] = await db
    .select()
    .from(translations)
    .where(
      and(
        eq(translations.episodeId, episodeId),
        eq(translations.targetLanguage, "ko"),
        eq(translations.provider, provider.provider),
        eq(translations.modelName, provider.modelName),
        eq(translations.promptVersion, PROMPT_VERSION),
        eq(translations.sourceChecksum, sourceChecksum),
      ),
    )
    .limit(1);

  if (existing) {
    // Allow retrying failed translations
    if (existing.status === "failed") {
      await db
        .update(translations)
        .set({ status: "queued", errorCode: null, errorMessage: null, updatedAt: new Date() })
        .where(eq(translations.id, existing.id));

      processTranslation(existing.id, episode.normalizedTextJa, provider).catch(
        () => {},
      );

      return { translationId: existing.id, status: "queued" };
    }
    return { translationId: existing.id, status: existing.status };
  }

  // Insert queued row — use onConflictDoNothing to handle race conditions
  // where two concurrent requests both pass the `existing` check above.
  const [row] = await db
    .insert(translations)
    .values({
      episodeId,
      targetLanguage: "ko",
      provider: provider.provider,
      modelName: provider.modelName,
      promptVersion: PROMPT_VERSION,
      sourceChecksum,
      status: "queued",
    })
    .onConflictDoNothing()
    .returning({ id: translations.id });

  if (!row) {
    // Conflict: another request already inserted — fetch and return it
    const [conflict] = await db
      .select()
      .from(translations)
      .where(
        and(
          eq(translations.episodeId, episodeId),
          eq(translations.targetLanguage, "ko"),
          eq(translations.provider, provider.provider),
          eq(translations.modelName, provider.modelName),
          eq(translations.promptVersion, PROMPT_VERSION),
          eq(translations.sourceChecksum, sourceChecksum),
        ),
      )
      .limit(1);
    return { translationId: conflict!.id, status: conflict!.status };
  }

  // Process immediately (will be async via job queue later)
  processTranslation(row.id, episode.normalizedTextJa, provider).catch(
    () => {
      // Error is persisted in the translation row
    },
  );

  return { translationId: row.id, status: "queued" };
}

async function processTranslation(
  translationId: string,
  sourceText: string,
  provider: OpenRouterProvider,
): Promise<void> {
  const db = getDb();

  // Mark as processing
  await db
    .update(translations)
    .set({ status: "processing", updatedAt: new Date() })
    .where(eq(translations.id, translationId));

  try {
    const result = await provider.translate({
      sourceText,
      sourceLanguage: "ja",
      targetLanguage: "ko",
    });

    const costUsd = (result.inputTokens != null && result.outputTokens != null)
      ? await estimateCost(provider.modelName, result.inputTokens, result.outputTokens)
      : null;

    await db
      .update(translations)
      .set({
        status: "available",
        translatedText: result.translatedText,
        inputTokens: result.inputTokens ?? null,
        outputTokens: result.outputTokens ?? null,
        estimatedCostUsd: costUsd,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(translations.id, translationId));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    await db
      .update(translations)
      .set({
        status: "failed",
        errorCode: "TRANSLATION_ERROR",
        errorMessage: message.slice(0, 1000),
        updatedAt: new Date(),
      })
      .where(eq(translations.id, translationId));
  }
}
