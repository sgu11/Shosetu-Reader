/**
 * Syosetu Novel API client.
 *
 * Uses the official API at https://api.syosetu.com/novelapi/api/ for the
 * general site, and https://api.syosetu.com/novel18api/api/ for the R-18
 * sister site (Nocturne / Midnight / MoonLight). Both endpoints return the
 * same JSON shape; only the base URL and an `over18=yes` cookie differ.
 *
 * Docs (Japanese): https://dev.syosetu.com/man/api/
 */

import { z } from "zod";

const DEFAULT_API_BASE = "https://api.syosetu.com/novelapi/api/";
const USER_AGENT = "ShosetuReader/0.1";

// Fields we request: title, ncode, writer, story, general_firstup,
// general_lastup, end, general_all_no, length, novelupdated_at
const OUTPUT_FIELDS = "t-n-w-s-gf-ga-e-nu-gl-l";

export interface SyosetuFetchConfig {
  apiBase?: string;
  /** Set to "over18=yes" for the R-18 (novel18) endpoint. */
  cookieHeader?: string;
}

const DEFAULT_CONFIG: Required<Pick<SyosetuFetchConfig, "apiBase">> = {
  apiBase: DEFAULT_API_BASE,
};

function resolveConfig(config?: SyosetuFetchConfig): Required<Pick<SyosetuFetchConfig, "apiBase">> & SyosetuFetchConfig {
  return { ...DEFAULT_CONFIG, ...(config ?? {}) };
}

function buildHeaders(cookieHeader?: string): Record<string, string> {
  const headers: Record<string, string> = { "User-Agent": USER_AGENT };
  if (cookieHeader) headers.Cookie = cookieHeader;
  return headers;
}

export type RankingPeriod = "daily" | "weekly" | "monthly" | "quarterly";

const RANKING_ORDER_MAP: Record<RankingPeriod, string> = {
  daily: "dailypoint",
  weekly: "weeklypoint",
  monthly: "monthlypoint",
  quarterly: "quarterpoint",
};

const syosetuNovelSchema = z.object({
  title: z.string(),
  ncode: z.string(),
  writer: z.string(),
  story: z.string(),
  general_firstup: z.string(),
  general_lastup: z.string(),
  end: z.number(), // 0 = ongoing short-story or completed, checked with novel type
  general_all_no: z.number(),
  length: z.number(),
  novelupdated_at: z.string(),
});

type SyosetuNovelRaw = z.infer<typeof syosetuNovelSchema>;

export interface SyosetuNovelMetadata {
  ncode: string;
  title: string;
  authorName: string;
  summary: string;
  firstPublishedAt: string;
  lastUpdatedAt: string;
  isCompleted: boolean;
  totalEpisodes: number;
  totalLength: number;
  novelUpdatedAt: string;
  raw: SyosetuNovelRaw;
}

export class SyosetuApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "SyosetuApiError";
  }
}

function adaptRow(rawNovel: SyosetuNovelRaw): SyosetuNovelMetadata {
  return {
    ncode: rawNovel.ncode.toLowerCase(),
    title: rawNovel.title,
    authorName: rawNovel.writer,
    summary: rawNovel.story,
    firstPublishedAt: rawNovel.general_firstup,
    lastUpdatedAt: rawNovel.general_lastup,
    isCompleted: rawNovel.end === 0 && rawNovel.general_all_no > 0,
    totalEpisodes: rawNovel.general_all_no,
    totalLength: rawNovel.length,
    novelUpdatedAt: rawNovel.novelupdated_at,
    raw: rawNovel,
  };
}

/**
 * Fetch novel metadata from the Syosetu API by ncode.
 */
export async function fetchNovelMetadata(
  ncode: string,
  config?: SyosetuFetchConfig,
): Promise<SyosetuNovelMetadata> {
  const cfg = resolveConfig(config);
  const url = new URL(cfg.apiBase);
  url.searchParams.set("ncode", ncode.toLowerCase());
  url.searchParams.set("of", OUTPUT_FIELDS);
  url.searchParams.set("out", "json");
  url.searchParams.set("lim", "1");

  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(20_000),
    headers: buildHeaders(cfg.cookieHeader),
  });

  if (!res.ok) {
    throw new SyosetuApiError(
      `Syosetu API returned ${res.status}`,
      res.status,
    );
  }

  const json = await res.json();

  // Response is an array: first element is { allcount: N }, rest are results
  if (!Array.isArray(json) || json.length < 2) {
    throw new SyosetuApiError(
      `Novel not found for ncode: ${ncode}. The Syosetu API returned no results.`,
    );
  }

  return adaptRow(syosetuNovelSchema.parse(json[1]));
}

/**
 * Fetch ranked novels from the Syosetu API.
 * Uses the novel API with ordering params (dailypoint, weeklypoint, etc.)
 */
export async function fetchRanking(
  period: RankingPeriod = "daily",
  limit: number = 20,
  config?: SyosetuFetchConfig,
): Promise<SyosetuNovelMetadata[]> {
  const cfg = resolveConfig(config);
  const order = RANKING_ORDER_MAP[period];
  const url = new URL(cfg.apiBase);
  url.searchParams.set("order", order);
  url.searchParams.set("type", "r"); // ongoing series only — exclude short stories (_t)
  url.searchParams.set("of", OUTPUT_FIELDS);
  url.searchParams.set("out", "json");
  url.searchParams.set("lim", String(Math.min(limit, 50)));

  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(20_000),
    headers: buildHeaders(cfg.cookieHeader),
  });

  if (!res.ok) {
    throw new SyosetuApiError(
      `Syosetu ranking API returned ${res.status}`,
      res.status,
    );
  }

  const json = await res.json();

  if (!Array.isArray(json) || json.length < 2) {
    return [];
  }

  // First element is { allcount: N }, rest are results
  const results: SyosetuNovelMetadata[] = [];
  for (let i = 1; i < json.length; i++) {
    const parsed = syosetuNovelSchema.safeParse(json[i]);
    if (parsed.success) {
      results.push(adaptRow(parsed.data));
    }
  }

  return results;
}
