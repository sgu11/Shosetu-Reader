import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { translationSettings } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { isKnownOpenRouterModel } from "@/lib/openrouter/models-cache";
import { DEFAULT_GLOBAL_PROMPT } from "@/modules/translation/domain/default-prompt";
import { resolveUserId } from "@/modules/identity/application/resolve-user-context";

const WORKLOAD_KEYS = [
  "translate",
  "title",
  "summary",
  "extraction",
  "compare",
  "bootstrap",
] as const;
type WorkloadKey = (typeof WORKLOAD_KEYS)[number];

function sanitizeWorkloadOverrides(
  raw: unknown,
): Partial<Record<WorkloadKey, string>> | null {
  if (!raw || typeof raw !== "object") return null;
  const out: Partial<Record<WorkloadKey, string>> = {};
  for (const key of WORKLOAD_KEYS) {
    const v = (raw as Record<string, unknown>)[key];
    if (typeof v === "string" && v.trim().length > 0) {
      out[key] = v.trim();
    }
  }
  return out;
}

export async function GET() {
  try {
    const userId = await resolveUserId();
    const db = getDb();

    const [settings] = await db
      .select({
        modelName: translationSettings.modelName,
        globalPrompt: translationSettings.globalPrompt,
        favoriteModels: translationSettings.favoriteModels,
        workloadOverrides: translationSettings.workloadOverrides,
      })
      .from(translationSettings)
      .where(eq(translationSettings.userId, userId))
      .limit(1);

    return NextResponse.json({
      modelName: settings?.modelName ?? env.OPENROUTER_DEFAULT_MODEL,
      globalPrompt: settings?.globalPrompt ?? "",
      defaultGlobalPrompt: DEFAULT_GLOBAL_PROMPT,
      favoriteModels: settings?.favoriteModels ?? [],
      workloadOverrides: settings?.workloadOverrides ?? {},
      workloadDefaults: {
        translate: env.OPENROUTER_TRANSLATE_MODEL ?? env.OPENROUTER_DEFAULT_MODEL,
        title: env.OPENROUTER_TITLE_MODEL ?? env.OPENROUTER_DEFAULT_MODEL,
        summary: env.OPENROUTER_SUMMARY_MODEL ?? env.OPENROUTER_DEFAULT_MODEL,
        extraction: env.OPENROUTER_EXTRACTION_MODEL ?? env.OPENROUTER_DEFAULT_MODEL,
        compare: env.OPENROUTER_COMPARE_MODEL ?? env.OPENROUTER_DEFAULT_MODEL,
        bootstrap: env.OPENROUTER_BOOTSTRAP_MODEL ?? env.OPENROUTER_DEFAULT_MODEL,
      },
    });
  } catch (err) {
    logger.error("Failed to fetch translation settings", {
      error: err instanceof Error ? err.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to fetch translation settings" }, { status: 500 });
  }
}

const MAX_MODEL_NAME_LENGTH = 200;
const MAX_GLOBAL_PROMPT_LENGTH = 5000;
const MAX_FAVORITES = 20;

export async function PUT(req: NextRequest) {
  try {
    const userId = await resolveUserId();
    const db = getDb();
    const body = await req.json();

    const { modelName, globalPrompt, favoriteModels, workloadOverrides } = body;

    // Validate length limits
    if (typeof modelName === "string" && modelName.length > MAX_MODEL_NAME_LENGTH) {
      return NextResponse.json(
        { error: `Model name too long (max ${MAX_MODEL_NAME_LENGTH} characters)` },
        { status: 400 },
      );
    }
    if (typeof globalPrompt === "string" && globalPrompt.length > MAX_GLOBAL_PROMPT_LENGTH) {
      return NextResponse.json(
        { error: `Global prompt too long (max ${MAX_GLOBAL_PROMPT_LENGTH} characters)` },
        { status: 400 },
      );
    }

    const [existing] = await db
      .select({ id: translationSettings.id })
      .from(translationSettings)
      .where(eq(translationSettings.userId, userId))
      .limit(1);

    const update: {
      modelName?: string;
      globalPrompt?: string;
      favoriteModels?: string[];
      workloadOverrides?: Partial<Record<WorkloadKey, string>> | null;
    } = {};
    if (typeof modelName === "string" && modelName.trim()) {
      const normalizedModelName = modelName.trim();
      const knownModel = await isKnownOpenRouterModel(normalizedModelName);
      if (!knownModel) {
        return NextResponse.json(
          { error: "Unknown OpenRouter model" },
          { status: 400 },
        );
      }
      update.modelName = normalizedModelName;
    }
    if (typeof globalPrompt === "string") {
      update.globalPrompt = globalPrompt;
    }
    if (Array.isArray(favoriteModels)) {
      const cleaned = Array.from(
        new Set(
          favoriteModels
            .filter((m): m is string => typeof m === "string")
            .map((m) => m.trim())
            .filter((m) => m.length > 0 && m.length <= MAX_MODEL_NAME_LENGTH),
        ),
      ).slice(0, MAX_FAVORITES);
      update.favoriteModels = cleaned;
    }
    if (workloadOverrides !== undefined) {
      const sanitized = sanitizeWorkloadOverrides(workloadOverrides);
      if (sanitized) {
        // Validate each model exists in the OpenRouter catalog.
        for (const value of Object.values(sanitized)) {
          if (value && value.length > MAX_MODEL_NAME_LENGTH) {
            return NextResponse.json(
              { error: `Workload model name too long (max ${MAX_MODEL_NAME_LENGTH})` },
              { status: 400 },
            );
          }
          if (value && !(await isKnownOpenRouterModel(value))) {
            return NextResponse.json(
              { error: `Unknown OpenRouter model in workload override: ${value}` },
              { status: 400 },
            );
          }
        }
        update.workloadOverrides = sanitized;
      } else if (workloadOverrides === null) {
        update.workloadOverrides = null;
      }
    }

    if (existing) {
      await db
        .update(translationSettings)
        .set({ ...update, updatedAt: new Date() })
        .where(eq(translationSettings.userId, userId));
    } else {
      await db.insert(translationSettings).values({
        userId,
        modelName: update.modelName ?? env.OPENROUTER_DEFAULT_MODEL,
        globalPrompt: update.globalPrompt ?? "",
        favoriteModels: update.favoriteModels ?? [],
        workloadOverrides: update.workloadOverrides ?? null,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("Failed to update translation settings", {
      error: err instanceof Error ? err.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to update translation settings" }, { status: 500 });
  }
}
