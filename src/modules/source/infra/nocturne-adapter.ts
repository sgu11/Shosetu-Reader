/**
 * Nocturne (https://novel18.syosetu.com/) — R-18 sister site of syosetu.
 *
 * Same JSON API shape and HTML scraper output as syosetu, but served from
 * separate hosts and gated behind an `over18=yes` cookie. Bare ncode pastes
 * always resolve to the general syosetu adapter — to register a nocturne
 * work, the user must paste a novel18 URL.
 */

import { createSyosetuFamilyAdapter } from "./syosetu-family";

export const nocturneAdapter = createSyosetuFamilyAdapter({
  site: "nocturne",
  isAdult: true,
  novelHost: "https://novel18.syosetu.com",
  apiBase: "https://api.syosetu.com/novel18api/api/",
  cookieHeader: "over18=yes",
  urlHost: "novel18.syosetu.com",
});
