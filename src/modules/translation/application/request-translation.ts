import { eq, and } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { episodes, translations, translationSettings, novelGlossaries } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { resolveUserId } from "@/modules/identity/application/resolve-user-context";
import { getJobQueue } from "@/modules/jobs/application/job-queue";
import { OpenRouterProvider } from "../infra/openrouter-provider";
import { estimateCost } from "./cost-estimation";

const PROMPT_VERSION = "v2";

export interface TranslationJobPayload {
  translationId: string;
  episodeId: string;
  novelId: string;
  ownerUserId: string;
  sourceText: string;
  provider: "openrouter";
  modelName: string;
  globalPrompt: string;
  glossary: string;
}

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

  const [glossaryRow] = await db
    .select({ glossary: novelGlossaries.glossary })
    .from(novelGlossaries)
    .where(eq(novelGlossaries.novelId, novelId))
    .limit(1);

  return {
    userId,
    modelName: settings?.modelName ?? env.OPENROUTER_DEFAULT_MODEL,
    globalPrompt: settings?.globalPrompt ?? "",
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
        .set({
          status: "queued",
          errorCode: null,
          errorMessage: null,
          completedAt: null,
          processingStartedAt: null,
          durationMs: null,
          updatedAt: new Date(),
        })
        .where(eq(translations.id, existing.id));

      await enqueueTranslationJob({
        translationId: existing.id,
        episodeId,
        novelId: episode.novelId,
        ownerUserId: ctx.userId,
        sourceText: episode.normalizedTextJa,
        provider: provider.provider,
        modelName: provider.modelName,
        globalPrompt: ctx.globalPrompt,
        glossary: ctx.glossary,
      });

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

  await enqueueTranslationJob({
    translationId: row.id,
    episodeId,
    novelId: episode.novelId,
    ownerUserId: ctx.userId,
    sourceText: episode.normalizedTextJa,
    provider: provider.provider,
    modelName: provider.modelName,
    globalPrompt: ctx.globalPrompt,
    glossary: ctx.glossary,
  });

  return { translationId: row.id, status: "queued" };
}

async function enqueueTranslationJob(payload: TranslationJobPayload) {
  const jobQueue = getJobQueue();

  await jobQueue.enqueue("translation.episode", payload, {
    entityType: "episode",
    entityId: payload.episodeId,
  });
}

export async function processQueuedTranslation(
  payload: TranslationJobPayload,
): Promise<void> {
  const db = getDb();
  const provider = new OpenRouterProvider(
    env.OPENROUTER_API_KEY ?? "",
    payload.modelName,
    payload.globalPrompt,
    payload.glossary,
  );

  const [translation] = await db
    .select({
      status: translations.status,
    })
    .from(translations)
    .where(eq(translations.id, payload.translationId))
    .limit(1);

  if (!translation) {
    throw new Error("Translation not found");
  }

  if (translation.status === "available") {
    return;
  }

  // Mark as processing
  await db
    .update(translations)
    .set({
      status: "processing",
      processingStartedAt: new Date(),
      durationMs: null,
      updatedAt: new Date(),
    })
    .where(eq(translations.id, payload.translationId));

  const providerStartTime = Date.now();

  try {
    const result = await provider.translate({
      sourceText: payload.sourceText,
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
        durationMs: providerStartTime
          ? Date.now() - providerStartTime
          : null,
        completedAt: new Date(),
        errorCode: null,
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(eq(translations.id, payload.translationId));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    await db
      .update(translations)
      .set({
        status: "failed",
        durationMs: providerStartTime
          ? Date.now() - providerStartTime
          : null,
        errorCode: "TRANSLATION_ERROR",
        errorMessage: message.slice(0, 1000),
        updatedAt: new Date(),
      })
      .where(eq(translations.id, payload.translationId));

    throw err;
  }
}
