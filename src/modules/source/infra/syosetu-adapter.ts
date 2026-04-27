/**
 * Syosetu (https://ncode.syosetu.com/) adapter — instantiated via the
 * shared family factory used by both syosetu and the R-18 nocturne site.
 */

import { createSyosetuFamilyAdapter } from "./syosetu-family";

export const syosetuAdapter = createSyosetuFamilyAdapter({
  site: "syosetu",
  isAdult: false,
  novelHost: "https://ncode.syosetu.com",
  apiBase: "https://api.syosetu.com/novelapi/api/",
  urlHost: "ncode.syosetu.com",
});
