/**
 * AlphaPolis (https://www.alphapolis.co.jp/) adapter.
 *
 * Source identity is composite: {authorId}/{novelId}. Both are decimal
 * integers concatenated with a slash; URLs always carry both. Episode ids
 * are alphapolis's `episodeNo` integers and flow through as
 * `sourceEpisodeId`.
 *
 * Wire layout:
 *   - Work page embeds `<script id="app-cover-data" type="application/json">`
 *     containing the title, author, and full episode TOC. The summary plus
 *     completion status come from the surrounding HTML.
 *   - Episode body is fetched in two steps: GET the episode page to harvest
 *     the per-page anti-scrape token + the Laravel CSRF token + a session
 *     cookie, then POST `/novel/episode_body` with those credentials. The
 *     response is an HTML fragment using `<br>` separators that the body
 *     parser converts to paragraphs.
 *   - Ranking page is a legacy SSR template (`/novel/ranking/hot`).
 */

import * as cheerio from "cheerio";
import { createHash } from "crypto";
import type {
  EpisodeContent,
  EpisodeRef,
  NovelMetadata,
  RankingPeriod,
  SourceAdapter,
  TocEntry,
} from "../domain/source-adapter";
import { parseAlphaPolisBody } from "./alphapolis-body-parser";

const NOVEL_HOST = "https://www.alphapolis.co.jp";
const USER_AGENT = "Mozilla/5.0 (compatible; ShosetuReader/0.1)";
const URL_HOST = "alphapolis.co.jp";

const SUPPORTED_PERIODS: readonly RankingPeriod[] = ["hot"];

const COMPOSITE_ID_PATTERN = /^(\d+)\/(\d+)$/;
const URL_PATTERN = /^https?:\/\/(?:www\.)?alphapolis\.co\.jp\/novel\/(\d+)\/(\d+)/i;

function buildNovelUrl(id: string) {
  return `${NOVEL_HOST}/novel/${id}`;
}

function buildEpisodeUrl(id: string, ep: { sourceEpisodeId: string }) {
  return `${NOVEL_HOST}/novel/${id}/episode/${ep.sourceEpisodeId}`;
}

interface AlphaPolisCoverData {
  content: {
    id: number;
    title: string;
    user: { name: string };
  };
  chapterEpisodes: Array<{
    title: string | null;
    chapterId: number | null;
    episodes: Array<{
      episodeNo: number;
      url: string;
      mainTitle: string;
      isPublic: boolean;
      dispOrder: number;
      upTime?: string;
      counterText?: string;
    }>;
  }>;
}

function extractCoverData(html: string): AlphaPolisCoverData {
  const match = html.match(
    /<script[^>]*id="app-cover-data"[^>]*>([\s\S]*?)<\/script>/,
  );
  if (!match) {
    throw new Error("alphapolis: app-cover-data script tag not found");
  }
  return JSON.parse(match[1].trim()) as AlphaPolisCoverData;
}

interface WorkPageInfo {
  cover: AlphaPolisCoverData;
  summary: string;
  isCompleted: boolean | null;
}

export function parseWorkPage(html: string): WorkPageInfo {
  const cover = extractCoverData(html);
  const $ = cheerio.load(html);

  const summary = $(".content-info .abstract, .abstract").first().text().trim();

  let isCompleted: boolean | null = null;
  $(".content-status").each((_i, el) => {
    const text = $(el).text().trim();
    if (text === "完結") isCompleted = true;
    if (text === "連載中") isCompleted = false;
  });

  return { cover, summary, isCompleted };
}

interface EpisodePageContext {
  token: string;
  csrfToken: string;
  cookies: string;
  title: string;
}

async function fetchEpisodeContext(
  url: string,
): Promise<EpisodePageContext> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(20_000),
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) {
    throw new Error(`alphapolis: GET ${url} returned ${res.status}`);
  }
  const html = await res.text();
  return parseEpisodePageContext(html, res.headers.get("set-cookie") ?? "");
}

export function parseEpisodePageContext(
  html: string,
  rawCookies: string,
): EpisodePageContext {
  const tokenMatch = html.match(/'token':\s*'([a-f0-9]{20,})'/);
  if (!tokenMatch) {
    throw new Error("alphapolis: episode body token not found in episode page");
  }
  const csrfMatch = html.match(
    /X-CSRF-TOKEN['":\s]+['"]([A-Za-z0-9]{20,})['"]/,
  );
  if (!csrfMatch) {
    throw new Error("alphapolis: CSRF token not found in episode page");
  }
  const $ = cheerio.load(html);
  const title = $(".episode-title").first().text().trim();

  // Pick the cookies we need to forward (Laravel session + XSRF). Set-Cookie
  // headers come back as a comma-separated string in fetch's API on Node.
  const cookies = rawCookies
    .split(/,(?=[^ ]+=)/)
    .map((c) => c.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");

  return {
    token: tokenMatch[1],
    csrfToken: csrfMatch[1],
    cookies,
    title,
  };
}

async function fetchEpisodeBody(
  episodeId: number,
  ctx: EpisodePageContext,
  refererUrl: string,
): Promise<string> {
  const body = new URLSearchParams({
    episode: String(episodeId),
    token: ctx.token,
  });
  const res = await fetch(`${NOVEL_HOST}/novel/episode_body`, {
    method: "POST",
    signal: AbortSignal.timeout(20_000),
    headers: {
      "User-Agent": USER_AGENT,
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-CSRF-TOKEN": ctx.csrfToken,
      "X-Requested-With": "XMLHttpRequest",
      Referer: refererUrl,
      Cookie: ctx.cookies,
    },
    body: body.toString(),
  });
  if (!res.ok) {
    throw new Error(
      `alphapolis: POST /novel/episode_body returned ${res.status}`,
    );
  }
  return res.text();
}

export function parseRankingPage(html: string, limit: number): NovelMetadata[] {
  const $ = cheerio.load(html);
  const items: NovelMetadata[] = [];
  const seen = new Set<string>();

  $('a[href*="/novel/"]').each((_i, el) => {
    if (items.length >= limit) return false;
    const href = $(el).attr("href") ?? "";
    const m = href.match(/\/novel\/(\d+)\/(\d+)(?:\b|\/?$)/);
    if (!m) return;
    const composite = `${m[1]}/${m[2]}`;
    if (seen.has(composite)) return;
    const title = $(el).text().trim();
    if (!title) return;
    seen.add(composite);
    items.push({
      id: composite,
      title,
      authorName: "",
      summary: "",
      firstPublishedAt: null,
      lastUpdatedAt: null,
      isCompleted: null,
      totalEpisodes: null,
      totalLength: null,
      novelUpdatedAt: null,
      raw: { source: "ranking", href },
    });
  });

  return items;
}

export const alphapolisAdapter: SourceAdapter = {
  site: "alphapolis",
  isAdult: false,
  supportedPeriods: SUPPORTED_PERIODS,

  matchUrl(input) {
    const trimmed = input.trim();
    if (!trimmed.toLowerCase().includes(URL_HOST)) return null;
    const m = trimmed.match(URL_PATTERN);
    return m ? `${m[1]}/${m[2]}` : null;
  },

  matchBareId(input) {
    const trimmed = input.trim();
    return COMPOSITE_ID_PATTERN.test(trimmed) ? trimmed : null;
  },

  buildNovelUrl,

  buildEpisodeUrl(id, ep) {
    return buildEpisodeUrl(id, ep);
  },

  async fetchNovelMetadata(id): Promise<NovelMetadata> {
    const res = await fetch(buildNovelUrl(id), {
      signal: AbortSignal.timeout(20_000),
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) {
      throw new Error(`alphapolis: GET work ${id} returned ${res.status}`);
    }
    const html = await res.text();
    const { cover, summary, isCompleted } = parseWorkPage(html);
    const totalEpisodes = cover.chapterEpisodes.reduce(
      (sum, ch) => sum + ch.episodes.length,
      0,
    );
    return {
      id,
      title: cover.content.title.trim(),
      authorName: cover.content.user.name,
      summary,
      firstPublishedAt: null,
      lastUpdatedAt: null,
      isCompleted,
      totalEpisodes,
      totalLength: null,
      novelUpdatedAt: null,
      raw: cover,
    };
  },

  async fetchEpisodeList(id): Promise<TocEntry[]> {
    const res = await fetch(buildNovelUrl(id), {
      signal: AbortSignal.timeout(20_000),
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) {
      throw new Error(`alphapolis: GET work ${id} returned ${res.status}`);
    }
    const html = await res.text();
    const { cover } = parseWorkPage(html);

    const entries: TocEntry[] = [];
    let counter = 1;
    for (const chapter of cover.chapterEpisodes) {
      for (const ep of chapter.episodes) {
        if (!ep.isPublic) continue;
        entries.push({
          episodeNumber: counter++,
          sourceEpisodeId: String(ep.episodeNo),
          title: ep.mainTitle,
          sourceUrl: `${NOVEL_HOST}${ep.url}`,
        });
      }
    }
    return entries;
  },

  async fetchEpisodeContent(id, ep: EpisodeRef): Promise<EpisodeContent> {
    const url = buildEpisodeUrl(id, ep);
    const ctx = await fetchEpisodeContext(url);
    const fragment = await fetchEpisodeBody(
      Number(ep.sourceEpisodeId),
      ctx,
      url,
    );
    const { paragraphs, normalizedText } = parseAlphaPolisBody(fragment);
    const checksum = createHash("sha256")
      .update(normalizedText)
      .digest("hex")
      .slice(0, 16);
    return {
      title: ctx.title || "",
      rawHtml: paragraphs.map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`).join("\n"),
      normalizedText,
      checksum,
      prefaceText: null,
      afterwordText: null,
    };
  },

  async fetchRanking(period, limit) {
    if (period !== "hot") {
      throw new Error(`alphapolis: only "hot" ranking is supported (got ${period})`);
    }
    const url = `${NOVEL_HOST}/novel/ranking/hot`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(20_000),
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) {
      throw new Error(`alphapolis: ranking fetch returned ${res.status}`);
    }
    const html = await res.text();
    return parseRankingPage(html, Math.min(limit, 20));
  },
};
