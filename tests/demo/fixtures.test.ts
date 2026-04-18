import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const fixturesDir = path.resolve(process.cwd(), "demo/seed/fixtures");

function readJson<T>(name: string): T {
  return JSON.parse(readFileSync(path.join(fixturesDir, name), "utf8")) as T;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe("demo fixtures", () => {
  it("novel has UUID id and required columns", () => {
    const novel = readJson<Record<string, unknown>>("novel.json");
    expect(novel.id).toMatch(UUID_RE);
    expect(novel).toMatchObject({
      source_ncode: expect.any(String),
      source_url: expect.any(String),
      title_ja: expect.any(String),
      title_ko: expect.any(String),
    });
  });

  it("episodes.ja has 5 entries with UUIDs + required columns", () => {
    const eps = readJson<Array<Record<string, unknown>>>("episodes.ja.json");
    expect(eps).toHaveLength(5);
    for (const ep of eps) {
      expect(ep.id).toMatch(UUID_RE);
      expect(ep.novel_id).toMatch(UUID_RE);
      expect(typeof ep.source_episode_id).toBe("string");
      expect(typeof ep.episode_number).toBe("number");
      expect(typeof ep.source_url).toBe("string");
      expect(typeof ep.raw_text_ja).toBe("string");
      expect(ep.fetch_status).toBe("fetched");
    }
  });

  it("episodes.ko has 5 translations with required columns", () => {
    const tx = readJson<Array<Record<string, unknown>>>("episodes.ko.json");
    expect(tx).toHaveLength(5);
    for (const t of tx) {
      expect(t.episode_id).toMatch(UUID_RE);
      expect(t.target_language).toBe("ko");
      expect(t.provider).toBe("demo");
      expect(t.model_name).toBe("demo-model");
      expect(t.prompt_version).toBe("v1");
      expect(typeof t.source_checksum).toBe("string");
      expect(t.status).toBe("available");
      expect(t.is_canonical).toBe(true);
      expect(typeof t.translated_text).toBe("string");
    }
  });

  it("glossary has parent + 8 entries with valid categories", () => {
    const g = readJson<{ novel_id: string; entries: Array<Record<string, unknown>> }>(
      "glossary.json",
    );
    expect(g.novel_id).toMatch(UUID_RE);
    expect(g.entries).toHaveLength(8);
    const validCategories = new Set(["character", "place", "term", "skill", "honorific"]);
    for (const e of g.entries) {
      expect(typeof e.term_ja).toBe("string");
      expect(typeof e.term_ko).toBe("string");
      expect(validCategories.has(e.category as string)).toBe(true);
    }
  });

  it("ranking has daily/weekly/monthly/quarterly keys", () => {
    const ranking = readJson<Record<string, unknown[]>>("ranking.json");
    for (const key of ["daily", "weekly", "monthly", "quarterly"]) {
      expect(Array.isArray(ranking[key])).toBe(true);
    }
  });
});
