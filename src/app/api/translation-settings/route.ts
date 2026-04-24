import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { translationSettings } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { isKnownOpenRouterModel } from "@/lib/openrouter/models-cache";
import { DEFAULT_GLOBAL_PROMPT } from "@/modules/translation/domain/default-prompt";
import { resolveUserId } from "@/modules/identity/application/resolve-user-context";

export async function GET() {
  try {
    const userId = await resolveUserId();
    const db = getDb();

    const [settings] = await db
      .select({
        modelName: translationSettings.modelName,
        globalPrompt: translationSettings.globalPrompt,
        favoriteModels: translationSettings.favoriteModels,
      })
      .from(translationSettings)
      .where(eq(translationSettings.userId, userId))
      .limit(1);

    return NextResponse.json({
      modelName: settings?.modelName ?? env.OPENROUTER_DEFAULT_MODEL,
      globalPrompt: settings?.globalPrompt ?? "",
      defaultGlobalPrompt: DEFAULT_GLOBAL_PROMPT,
      favoriteModels: settings?.favoriteModels ?? [],
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

    const { modelName, globalPrompt, favoriteModels } = body;

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
