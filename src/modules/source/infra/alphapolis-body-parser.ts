/**
 * AlphaPolis episode body parser.
 *
 * The episode body endpoint returns a fragment of HTML with `<br>` separators
 * instead of `<p>` paragraphs (anti-scraping convention). We walk the text
 * with the rule:
 *   - 2+ consecutive `<br>` (with optional whitespace/&nbsp; in between) →
 *     paragraph break.
 *   - Single `<br>` → newline within a paragraph.
 *   - `<rt>` ruby readings stripped, base text retained.
 */

import * as cheerio from "cheerio";

export interface AlphaPolisBody {
  paragraphs: string[];
  normalizedText: string;
}

export function parseAlphaPolisBody(html: string): AlphaPolisBody {
  const $ = cheerio.load(`<div id="root">${html}</div>`);
  const root = $("#root").first();

  // Drop ruby readings: <rt>…</rt> is the kana gloss; we want the base text.
  root.find("rt, rp").remove();

  // Convert <br> to a marker we can split on. Use a unique sentinel.
  const SENTINEL_BR = "BR";
  root.find("br").replaceWith(SENTINEL_BR);

  // Now serialize text with sentinels, then split.
  const flat = root.text().replace(/ /g, " ").trim();

  // Multiple BR → paragraph break; single BR → newline.
  const blocks = flat.split(new RegExp(`(?:${SENTINEL_BR}){2,}`));
  const paragraphs: string[] = [];

  for (const block of blocks) {
    const text = block
      .split(SENTINEL_BR)
      .map((s) => s.trim())
      .filter(Boolean)
      .join("\n");
    if (text.length > 0) paragraphs.push(text);
  }

  return {
    paragraphs,
    normalizedText: paragraphs.join("\n"),
  };
}
