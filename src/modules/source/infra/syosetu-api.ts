/**
 * Syosetu Novel API client.
 *
 * Uses the official API at https://api.syosetu.com/novelapi/api/
 * Docs (Japanese): https://dev.syosetu.com/man/api/
 */

import { z } from "zod";

const SYOSETU_API_BASE = "https://api.syosetu.com/novelapi/api/";

// Fields we request: title, ncode, writer, story, general_firstup,
// general_lastup, end, general_all_no, length, novelupdated_at
const OUTPUT_FIELDS = "t-n-w-s-gf-ga-e-nu-gl-l";

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

/**
 * Fetch novel metadata from the Syosetu API by ncode.
 */
export async function fetchNovelMetadata(
  ncode: string,
): Promise<SyosetuNovelMetadata> {
  const url = new URL(SYOSETU_API_BASE);
  url.searchParams.set("ncode", ncode.toLowerCase());
  url.searchParams.set("of", OUTPUT_FIELDS);
  url.searchParams.set("out", "json");
  url.searchParams.set("lim", "1");

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "ShosetuReader/0.1" },
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

  const rawNovel = syosetuNovelSchema.parse(json[1]);

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
