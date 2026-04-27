import { describe, expect, it } from "vitest";
import { parseBootstrapEntries } from "@/modules/translation/application/bootstrap-glossary";

describe("parseBootstrapEntries", () => {
  const candidateSet = new Set(["主人公", "魔法学院", "炎の剣", "山田"]);

  it("parses well-formed JSON entries", () => {
    const content = JSON.stringify({
      entries: [
        {
          term_ja: "主人公",
          term_ko: "주인공",
          category: "character",
          importance: 5,
        },
        {
          term_ja: "魔法学院",
          term_ko: "마법학원",
          reading: "まほうがくいん",
          category: "place",
          importance: 4,
        },
      ],
    });
    const out = parseBootstrapEntries(content, candidateSet);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({
      termJa: "主人공".replace("공", "公"),
      termKo: "주인공",
      category: "character",
      status: "suggested",
      confidence: 0.4,
    });
    expect(out[1].reading).toBe("まほうがくいん");
  });

  it("rejects hallucinated terms not in candidate set", () => {
    const content = JSON.stringify({
      entries: [
        { term_ja: "主人公", term_ko: "주인공", category: "character" },
        { term_ja: "存在しない", term_ko: "없는 것", category: "term" },
      ],
    });
    const out = parseBootstrapEntries(content, candidateSet);
    expect(out).toHaveLength(1);
    expect(out[0].termJa).toBe("主人公");
  });

  it("clamps importance to 1..5", () => {
    const content = JSON.stringify({
      entries: [
        { term_ja: "主人公", term_ko: "주인공", category: "character", importance: 99 },
        { term_ja: "魔法学院", term_ko: "마법학원", category: "place", importance: -3 },
      ],
    });
    const out = parseBootstrapEntries(content, candidateSet);
    expect(out[0].importance).toBe(5);
    expect(out[1].importance).toBe(1);
  });

  it("falls back to category=term when LLM returns invalid category", () => {
    const content = JSON.stringify({
      entries: [
        { term_ja: "主人公", term_ko: "주인공", category: "lol-not-real" },
      ],
    });
    const out = parseBootstrapEntries(content, candidateSet);
    expect(out).toHaveLength(1);
    expect(out[0].category).toBe("term");
  });

  it("drops entries where term_ja equals term_ko (no-op translation)", () => {
    const content = JSON.stringify({
      entries: [
        { term_ja: "主人公", term_ko: "主人公", category: "character" },
      ],
    });
    const out = parseBootstrapEntries(content, candidateSet);
    expect(out).toHaveLength(0);
  });

  it("recovers from LLM wrapping JSON in surrounding prose", () => {
    const content = `Here are the entries:\n\n${JSON.stringify({
      entries: [{ term_ja: "山田", term_ko: "야마다", category: "character" }],
    })}\n\nThanks!`;
    const out = parseBootstrapEntries(content, candidateSet);
    expect(out).toHaveLength(1);
    expect(out[0].termJa).toBe("山田");
  });

  it("returns empty array on unparseable content", () => {
    const out = parseBootstrapEntries("not json at all", candidateSet);
    expect(out).toEqual([]);
  });

  it("trims whitespace from term_ja and term_ko", () => {
    const content = JSON.stringify({
      entries: [
        { term_ja: "  主人公  ", term_ko: "  주인공  ", category: "character" },
      ],
    });
    const out = parseBootstrapEntries(content, candidateSet);
    expect(out[0].termJa).toBe("主人公");
    expect(out[0].termKo).toBe("주인공");
  });
});
