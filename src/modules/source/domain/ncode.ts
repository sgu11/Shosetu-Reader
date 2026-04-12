/**
 * Syosetu ncode parsing and validation.
 *
 * Ncodes look like "n1234ab" — a lowercase "n" followed by digits and lowercase letters.
 * URLs look like "https://ncode.syosetu.com/n1234ab/" or variant subdomains.
 */

const NCODE_PATTERN = /^n[0-9]+[a-z]+$/;
const SYOSETU_URL_PATTERN =
  /^https?:\/\/(?:ncode|novel18)\.syosetu\.com\/(n[0-9]+[a-z]+)\/?/i;

export function parseNcode(input: string): string | null {
  const trimmed = input.trim().toLowerCase();

  // Direct ncode
  if (NCODE_PATTERN.test(trimmed)) {
    return trimmed;
  }

  // URL
  const match = trimmed.match(SYOSETU_URL_PATTERN);
  if (match) {
    return match[1].toLowerCase();
  }

  return null;
}

export function isValidNcode(ncode: string): boolean {
  return NCODE_PATTERN.test(ncode.toLowerCase());
}

export function buildNovelUrl(ncode: string): string {
  return `https://ncode.syosetu.com/${ncode}/`;
}

export function buildEpisodeUrl(ncode: string, episodeNumber: number): string {
  return `https://ncode.syosetu.com/${ncode}/${episodeNumber}/`;
}
