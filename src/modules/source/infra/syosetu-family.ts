/**
 * Shared factory for the Syosetu family of sites (general syosetu and the
 * R-18 nocturne sister). Both share the same novel API shape and HTML
 * scraper output; only the API base URL, novel host URL, and an `over18`
 * cookie differ.
 */

import type {
  EpisodeRef,
  NovelMetadata,
  RankingPeriod,
  SourceAdapter,
  SourceSite,
  TocEntry,
} from "../domain/source-adapter";
import { isValidNcode, parseNcode } from "../domain/ncode";
import {
  fetchNovelMetadata as syosetuFetchNovelMetadata,
  fetchRanking as syosetuFetchRanking,
  type RankingPeriod as SyosetuPeriod,
  type SyosetuFetchConfig,
  type SyosetuNovelMetadata,
} from "./syosetu-api";
import {
  fetchEpisodeList as syosetuFetchEpisodeList,
  fetchEpisodeContent as syosetuFetchEpisodeContent,
} from "./episode-scraper";

const SUPPORTED_PERIODS: readonly RankingPeriod[] = [
  "daily",
  "weekly",
  "monthly",
  "quarterly",
];

export interface SyosetuFamilyOptions {
  site: Extract<SourceSite, "syosetu" | "nocturne">;
  isAdult: boolean;
  /** Hostname (no trailing slash) used for novel + episode URLs. */
  novelHost: string;
  apiBase: string;
  /** Optional cookie header forwarded with every fetch (e.g. "over18=yes"). */
  cookieHeader?: string;
  /**
   * URL pattern host this adapter recognizes via matchUrl. Lowercase host
   * substring; e.g. "novel18.syosetu.com" or "ncode.syosetu.com".
   */
  urlHost: string;
}

function adaptMetadata(meta: SyosetuNovelMetadata): NovelMetadata {
  return {
    id: meta.ncode,
    title: meta.title,
    authorName: meta.authorName,
    summary: meta.summary,
    firstPublishedAt: meta.firstPublishedAt,
    lastUpdatedAt: meta.lastUpdatedAt,
    isCompleted: meta.isCompleted,
    totalEpisodes: meta.totalEpisodes,
    totalLength: meta.totalLength,
    novelUpdatedAt: meta.novelUpdatedAt,
    raw: meta.raw,
  };
}

export function createSyosetuFamilyAdapter(opts: SyosetuFamilyOptions): SourceAdapter {
  const apiConfig: SyosetuFetchConfig = {
    apiBase: opts.apiBase,
    cookieHeader: opts.cookieHeader,
  };

  const buildNovelUrl = (id: string) => `${opts.novelHost}/${id}/`;
  const buildEpUrl = (id: string, episodeNumber: number) =>
    `${opts.novelHost}/${id}/${episodeNumber}/`;

  return {
    site: opts.site,
    isAdult: opts.isAdult,
    supportedPeriods: SUPPORTED_PERIODS,

    matchUrl(input) {
      const trimmed = input.trim();
      if (!/^https?:\/\//i.test(trimmed)) return null;
      const lower = trimmed.toLowerCase();
      if (!lower.includes(opts.urlHost)) return null;
      return parseNcode(trimmed);
    },

    matchBareId(input) {
      // Bare ncodes are syosetu-only by convention; nocturne requires the
      // URL form to disambiguate (the ncode regex matches both spaces).
      if (opts.site !== "syosetu") return null;
      const trimmed = input.trim().toLowerCase();
      return isValidNcode(trimmed) ? trimmed : null;
    },

    buildNovelUrl,

    buildEpisodeUrl(id, ep) {
      return buildEpUrl(id, ep.episodeNumber);
    },

    async fetchNovelMetadata(id) {
      return adaptMetadata(await syosetuFetchNovelMetadata(id, apiConfig));
    },

    async fetchEpisodeList(id): Promise<TocEntry[]> {
      const entries = await syosetuFetchEpisodeList(id, {
        novelBaseUrl: buildNovelUrl,
        buildEpisodeUrl: (n, ep) => buildEpUrl(n, ep),
        cookieHeader: opts.cookieHeader,
      });
      return entries.map((e) => ({
        episodeNumber: e.episodeNumber,
        sourceEpisodeId: String(e.episodeNumber),
        title: e.title,
        sourceUrl: e.sourceUrl,
      }));
    },

    async fetchEpisodeContent(id, ep: EpisodeRef) {
      return syosetuFetchEpisodeContent(id, ep.episodeNumber, {
        novelBaseUrl: buildNovelUrl,
        buildEpisodeUrl: (n, en) => buildEpUrl(n, en),
        cookieHeader: opts.cookieHeader,
      });
    },

    async fetchRanking(period, limit) {
      const items = await syosetuFetchRanking(
        period as SyosetuPeriod,
        limit,
        apiConfig,
      );
      return items.map(adaptMetadata);
    },
  };
}
