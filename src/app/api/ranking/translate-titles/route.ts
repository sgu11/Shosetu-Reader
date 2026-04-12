import { NextRequest, NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { rateLimit } from "@/lib/rate-limit";
import { env } from "@/lib/env";
import { getDb } from "@/lib/db/client";
import { titleTranslationCache } from "@/lib/db/schema";

const RATE_LIMIT_CONFIG = { limit: 10, windowSeconds: 60 };
const MAX_TITLES = 50;

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, RATE_LIMIT_CONFIG, "ranking-translate");
  if (limited) return limited;

  try {
    const body = await req.json();
    const titles: string[] = body.titles;

    if (!Array.isArray(titles) || titles.length === 0) {
      return NextResponse.json({ error: "titles array required" }, { status: 400 });
    }

    if (titles.length > MAX_TITLES) {
      return NextResponse.json({ error: `Max ${MAX_TITLES} titles` }, { status: 400 });
    }

    const db = getDb();

    // Check cache
    const cached = await db
      .select()
      .from(titleTranslationCache)
      .where(inArray(titleTranslationCache.titleJa, titles));

    const cacheMap = new Map(cached.map((r) => [r.titleJa, r.titleKo]));

    // Find uncached titles
    const uncached = titles.filter((t) => !cacheMap.has(t));

    if (uncached.length > 0 && env.OPENROUTER_API_KEY) {
      // Translate only uncached titles
      const translated = await translateViaBatch(uncached);

      // Store in cache
      const rows = uncached
        .map((ja, i) => {
          const ko = translated[i];
          if (ko && ko !== ja) {
            cacheMap.set(ja, ko);
            return { titleJa: ja, titleKo: ko };
          }
          return null;
        })
        .filter((r): r is { titleJa: string; titleKo: string } => r !== null);

      if (rows.length > 0) {
        await db
          .insert(titleTranslationCache)
          .values(rows)
          .onConflictDoNothing();
      }
    }

    const result = titles.map((t) => cacheMap.get(t) ?? t);
    return NextResponse.json({ translations: result });
  } catch (err) {
    console.error("Title translation error:", err);
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }
}

async function translateViaBatch(titles: string[]): Promise<string[]> {
  const numbered = titles.map((t, i) => `${i + 1}. ${t}`).join("\n");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://shosetu-reader.local",
      "X-Title": "Shosetu Reader",
    },
    body: JSON.stringify({
      model: env.OPENROUTER_DEFAULT_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a Japanese-to-Korean translator. Translate novel titles naturally into Korean. Keep character names in their original form. Output ONLY the numbered list of translated titles, one per line, matching the input numbering exactly. No explanations.",
        },
        {
          role: "user",
          content: `Translate these Japanese novel titles to Korean:\n\n${numbered}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    console.error("OpenRouter title translation failed:", res.status);
    return titles; // fallback to originals
  }

  const data = await res.json();
  const content: string = data.choices?.[0]?.message?.content ?? "";

  const translated: Record<number, string> = {};
  for (const line of content.split("\n")) {
    const match = line.match(/^(\d+)\.\s*(.+)/);
    if (match) {
      translated[parseInt(match[1], 10) - 1] = match[2].trim();
    }
  }

  return titles.map((original, i) => translated[i] ?? original);
}
