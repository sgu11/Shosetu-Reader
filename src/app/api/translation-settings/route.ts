import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { translationSettings } from "@/lib/db/schema";
import { ensureDefaultUser } from "@/lib/auth/default-user";
import { env } from "@/lib/env";
import { DEFAULT_GLOBAL_PROMPT } from "@/modules/translation/domain/default-prompt";

export async function GET() {
  try {
    const userId = await ensureDefaultUser();
    const db = getDb();

    const [settings] = await db
      .select({
        modelName: translationSettings.modelName,
        globalPrompt: translationSettings.globalPrompt,
      })
      .from(translationSettings)
      .where(eq(translationSettings.userId, userId))
      .limit(1);

    return NextResponse.json({
      modelName: settings?.modelName ?? env.OPENROUTER_DEFAULT_MODEL,
      globalPrompt: settings?.globalPrompt ?? "",
      defaultGlobalPrompt: DEFAULT_GLOBAL_PROMPT,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch translation settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = await ensureDefaultUser();
    const db = getDb();
    const body = await req.json();

    const { modelName, globalPrompt } = body;

    const [existing] = await db
      .select({ id: translationSettings.id })
      .from(translationSettings)
      .where(eq(translationSettings.userId, userId))
      .limit(1);

    const update: Record<string, string> = {};
    if (typeof modelName === "string" && modelName.trim()) {
      update.modelName = modelName.trim();
    }
    if (typeof globalPrompt === "string") {
      update.globalPrompt = globalPrompt;
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
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update translation settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
