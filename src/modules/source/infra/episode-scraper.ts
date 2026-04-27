/**
 * Syosetu-family episode scraping — TOC parsing and episode body extraction.
 *
 * The HTML shape is the same on the general site (`ncode.syosetu.com`) and
 * the R-18 sister site (`novel18.syosetu.com`). Callers pass the host-specific
 * novel URL plus optional cookie header (e.g. `over18=yes` for novel18).
 *
 * TOC page: {novelBase}/{ncode}/
 *   - Episodes listed as <a href="/{ncode}/{num}/" class="p-eplist__subtitle">
 *   - Chapter headings in <div class="p-eplist__chapter-title">
 *
 * Episode page: {novelBase}/{ncode}/{num}/
 *   - Title in <h1 class="p-novel__title">
 *   - Body paragraphs in <p id="L1">, <p id="L2">, etc.
 */

import * as cheerio from "cheerio";
import { createHash } from "crypto";
import { buildNovelUrl, buildEpisodeUrl } from "../domain/ncode";

const USER_AGENT = "ShosetuReader/0.1";

export interface ScraperConfig {
  /**
   * Override the default `https://ncode.syosetu.com/` host (used by the
   * nocturne adapter to point at `https://novel18.syosetu.com/`).
   */
  novelBaseUrl?: (ncode: string) => string;
  buildEpisodeUrl?: (ncode: string, episodeNumber: number) => string;
  /** Cookie header to forward (e.g. "over18=yes" for novel18). */
  cookieHeader?: string;
}

function resolveConfig(config?: ScraperConfig) {
  return {
    novelBaseUrl: config?.novelBaseUrl ?? buildNovelUrl,
    buildEpisodeUrl: config?.buildEpisodeUrl ?? buildEpisodeUrl,
    cookieHeader: config?.cookieHeader,
  };
}

export interface TocEntry {
  episodeNumber: number;
  title: string;
  sourceUrl: string;
}

export interface EpisodeContent {
  title: string;
  rawHtml: string;
  normalizedText: string;
  checksum: string;
  /** Author preface (前書き) — null when absent */
  prefaceText: string | null;
  /** Author afterword (後書き) — null when absent */
  afterwordText: string | null;
}

/**
 * Fetch and parse the novel's table of contents to get episode list.
 * Follows pagination automatically (Syosetu shows ~100 episodes per page).
 */
export async function fetchEpisodeList(
  ncode: string,
  config?: ScraperConfig,
): Promise<TocEntry[]> {
  const cfg = resolveConfig(config);
  const allEntries: TocEntry[] = [];
  let page = 1;

  while (true) {
    const baseUrl = cfg.novelBaseUrl(ncode);
    const url = page === 1 ? baseUrl : `${baseUrl}?p=${page}`;
    const html = await fetchPage(url, cfg.cookieHeader);
    const entries = parseToc(html, (ep) => cfg.buildEpisodeUrl(ncode, ep));

    if (entries.length === 0) break;
    allEntries.push(...entries);

    // Check if there's a next page
    const lastPage = parseLastPage(html);
    if (page >= lastPage) break;
    page++;
  }

  return allEntries;
}

/**
 * Fetch and parse a single episode's content.
 */
export async function fetchEpisodeContent(
  ncode: string,
  episodeNumber: number,
  config?: ScraperConfig,
): Promise<EpisodeContent> {
  const cfg = resolveConfig(config);
  const url = cfg.buildEpisodeUrl(ncode, episodeNumber);
  const html = await fetchPage(url, cfg.cookieHeader);
  return parseEpisodePage(html);
}

// --- Internal ---

async function fetchPage(url: string, cookieHeader?: string): Promise<string> {
  const headers: Record<string, string> = { "User-Agent": USER_AGENT };
  if (cookieHeader) headers.Cookie = cookieHeader;

  const res = await fetch(url, {
    signal: AbortSignal.timeout(20_000),
    headers,
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`);
  }

  return res.text();
}

/**
 * Extract the last page number from the TOC pagination.
 * Looks for: <a href="/ncode/?p=N" class="c-pager__item c-pager__item--last">
 * Returns 1 if no pagination is found.
 */
function parseLastPage(html: string): number {
  const $ = cheerio.load(html);
  const lastLink = $("a.c-pager__item--last").first().attr("href");
  if (!lastLink) return 1;
  const match = lastLink.match(/[?&]p=(\d+)/);
  return match ? parseInt(match[1], 10) : 1;
}

export function parseToc(
  html: string,
  buildEpUrl: (episodeNumber: number) => string,
): TocEntry[] {
  const $ = cheerio.load(html);
  const entries: TocEntry[] = [];

  $("a.p-eplist__subtitle").each((_i, el) => {
    const href = $(el).attr("href") ?? "";
    const match = href.match(/\/(\d+)\/?\s*$/);
    if (!match) return;

    const episodeNumber = parseInt(match[1], 10);
    const title = $(el).text().trim();

    entries.push({
      episodeNumber,
      title,
      sourceUrl: buildEpUrl(episodeNumber),
    });
  });

  return entries;
}

/**
 * Extract paragraph text from a container element.
 * Collects all <p> children and returns their text joined by newlines,
 * or null when the container doesn't exist.
 */
function extractSection(
  $: cheerio.CheerioAPI,
  selector: string,
): { text: string | null; html: string | null } {
  const container = $(selector).first();
  if (container.length === 0) return { text: null, html: null };

  const lines: string[] = [];
  container.find("p").each((_i, el) => {
    lines.push($(el).text());
  });

  if (lines.length === 0) return { text: null, html: null };

  const text = lines.join("\n");
  const html = container.find("p").map((_i, el) => $.html(el)).get().join("\n");

  return { text, html };
}

export function parseEpisodePage(html: string): EpisodeContent {
  const $ = cheerio.load(html);

  const title = $("h1.p-novel__title").first().text().trim();

  // Preface: <div class="p-novel__text--preface">
  const preface = extractSection($, ".p-novel__text--preface");

  // Body: <div class="p-novel__text"> that is NOT preface/afterword.
  // Select the text div without modifier classes.
  const bodyContainer = $(".p-novel__text")
    .not(".p-novel__text--preface")
    .not(".p-novel__text--afterword")
    .first();

  const paragraphs: string[] = [];
  bodyContainer.find("p").each((_i, el) => {
    paragraphs.push($(el).text());
  });

  const rawHtml = bodyContainer
    .find("p")
    .map((_i, el) => $.html(el))
    .get()
    .join("\n");

  const normalizedText = paragraphs.join("\n");

  // Afterword: <div class="p-novel__text--afterword">
  const afterword = extractSection($, ".p-novel__text--afterword");

  // Checksum covers all sections for change detection
  const checksumInput = [preface.text, normalizedText, afterword.text]
    .filter(Boolean)
    .join("\n---\n");

  const checksum = createHash("sha256")
    .update(checksumInput)
    .digest("hex")
    .slice(0, 16);

  return {
    title: title || "",
    rawHtml,
    normalizedText,
    checksum,
    prefaceText: preface.text,
    afterwordText: afterword.text,
  };
}
