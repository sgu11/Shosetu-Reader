import { NextRequest, NextResponse } from "next/server";
import {
  generateGlossary,
  getGlossary,
  updateGlossary,
} from "@/modules/translation/application/generate-glossary";

interface RouteContext {
  params: Promise<{ novelId: string }>;
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { novelId } = await context.params;
    const row = await getGlossary(novelId);
    return NextResponse.json({
      glossary: row?.glossary ?? "",
      modelName: row?.modelName ?? null,
      episodeCount: row?.episodeCount ?? null,
      generatedAt: row?.generatedAt ?? null,
    });
  } catch (err) {
    console.error("Failed to fetch glossary:", err);
    return NextResponse.json({ error: "Failed to fetch glossary" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const { novelId } = await context.params;
    const body = await req.json();
    const glossary = typeof body.glossary === "string" ? body.glossary : "";

    if (glossary.length > 50000) {
      return NextResponse.json(
        { error: "Glossary too long (max 50000 characters)" },
        { status: 400 },
      );
    }

    await updateGlossary(novelId, glossary);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to update glossary:", err);
    return NextResponse.json({ error: "Failed to update glossary" }, { status: 500 });
  }
}

export async function POST(_req: NextRequest, context: RouteContext) {
  try {
    const { novelId } = await context.params;
    const result = await generateGlossary(novelId);
    return NextResponse.json({
      glossary: result.glossary,
      modelName: result.modelName,
      episodeCount: result.episodeCount,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Failed to generate glossary:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
