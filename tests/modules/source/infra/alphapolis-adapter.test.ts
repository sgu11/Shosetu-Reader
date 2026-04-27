import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";
import {
  alphapolisAdapter,
  parseEpisodePageContext,
  parseRankingPage,
  parseWorkPage,
} from "@/modules/source/infra/alphapolis-adapter";
import { parseAlphaPolisBody } from "@/modules/source/infra/alphapolis-body-parser";

const FIXTURE_DIR = resolve(__dirname, "fixtures/alphapolis");
const workHtml = readFileSync(resolve(FIXTURE_DIR, "work.html"), "utf-8");
const episodeHtml = readFileSync(resolve(FIXTURE_DIR, "episode.html"), "utf-8");
const rankingHtml = readFileSync(resolve(FIXTURE_DIR, "ranking-hot.html"), "utf-8");
const bodyHtml = readFileSync(resolve(FIXTURE_DIR, "episode-body.html"), "utf-8");

describe("alphapolisAdapter identity", () => {
  it("declares the right site identity", () => {
    expect(alphapolisAdapter.site).toBe("alphapolis");
    expect(alphapolisAdapter.supportedPeriods).toEqual(["hot"]);
  });

  it("matches alphapolis URLs", () => {
    expect(
      alphapolisAdapter.matchUrl(
        "https://www.alphapolis.co.jp/novel/101715426/813048051",
      ),
    ).toBe("101715426/813048051");
    expect(
      alphapolisAdapter.matchUrl(
        "https://www.alphapolis.co.jp/novel/101715426/813048051/episode/123",
      ),
    ).toBe("101715426/813048051");
    expect(alphapolisAdapter.matchUrl("https://kakuyomu.jp/works/1")).toBeNull();
  });

  it("matches bare composite ids", () => {
    expect(alphapolisAdapter.matchBareId("101715426/813048051")).toBe(
      "101715426/813048051",
    );
    expect(alphapolisAdapter.matchBareId("n1234ab")).toBeNull();
    expect(alphapolisAdapter.matchBareId("1234567890")).toBeNull();
  });

  it("builds expected URLs", () => {
    expect(alphapolisAdapter.buildNovelUrl("101715426/813048051")).toBe(
      "https://www.alphapolis.co.jp/novel/101715426/813048051",
    );
    expect(
      alphapolisAdapter.buildEpisodeUrl("101715426/813048051", {
        episodeNumber: 1,
        sourceEpisodeId: "11102208",
      }),
    ).toBe(
      "https://www.alphapolis.co.jp/novel/101715426/813048051/episode/11102208",
    );
  });
});

describe("parseWorkPage", () => {
  it("extracts title, author, episode list, and summary", () => {
    const info = parseWorkPage(workHtml);
    expect(info.cover.content.id).toBe(813048051);
    expect(info.cover.content.title.length).toBeGreaterThan(0);
    expect(info.cover.content.user.name.length).toBeGreaterThan(0);
    expect(info.cover.chapterEpisodes.length).toBeGreaterThan(0);
    const totalEpisodes = info.cover.chapterEpisodes.reduce(
      (sum, ch) => sum + ch.episodes.length,
      0,
    );
    expect(totalEpisodes).toBeGreaterThan(0);
    expect(info.summary.length).toBeGreaterThan(0);
  });
});

describe("parseEpisodePageContext", () => {
  it("extracts the episode-body token, CSRF token, and title", () => {
    const ctx = parseEpisodePageContext(episodeHtml, "");
    expect(ctx.token).toMatch(/^[a-f0-9]{20,}$/);
    expect(ctx.csrfToken).toMatch(/^[A-Za-z0-9]{20,}$/);
    expect(ctx.title.length).toBeGreaterThan(0);
  });
});

describe("parseAlphaPolisBody", () => {
  it("splits the <br>-separated fragment into paragraphs", () => {
    const body = parseAlphaPolisBody(bodyHtml);
    expect(body.paragraphs.length).toBeGreaterThan(0);
    expect(body.normalizedText.length).toBeGreaterThan(0);
    // No HTML tags should remain in the normalized text
    expect(body.normalizedText).not.toContain("<br");
    expect(body.normalizedText).not.toContain("<p");
  });

  it("treats <br><br> as paragraph break and single <br> as line break", () => {
    const sample = "first<br>line<br><br>second paragraph<br><br>third";
    const body = parseAlphaPolisBody(sample);
    expect(body.paragraphs).toEqual([
      "first\nline",
      "second paragraph",
      "third",
    ]);
  });

  it("strips ruby <rt> readings, keeping base text", () => {
    const sample = "<ruby>漢字<rt>かんじ</rt></ruby>です";
    const body = parseAlphaPolisBody(sample);
    expect(body.normalizedText).toBe("漢字です");
  });
});

describe("parseRankingPage", () => {
  it("returns a deduped list of work composite ids", () => {
    const items = parseRankingPage(rankingHtml, 20);
    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThanOrEqual(20);
    for (const item of items) {
      expect(item.id).toMatch(/^\d+\/\d+$/);
    }
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
  });
});
