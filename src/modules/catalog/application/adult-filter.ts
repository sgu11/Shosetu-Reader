/**
 * Application-layer gate for adult-content sources. Anonymous callers (no
 * active profile / null context) always see SFW only; authenticated profiles
 * surface their stored preference.
 */

import type { SourceSite } from "@/modules/source/domain/source-adapter";
import { getAdapter } from "@/modules/source/infra/registry";

export interface AdultFilterContext {
  adultContentEnabled: boolean;
}

export function isAdultSite(site: SourceSite): boolean {
  try {
    return getAdapter(site).isAdult;
  } catch {
    // Adapter not yet registered for this enum value — treat as adult-safe
    // until the per-site flag flips on.
    return false;
  }
}

export function filterAdultContent<T extends { sourceSite: SourceSite }>(
  items: T[],
  ctx: AdultFilterContext | null,
): T[] {
  if (ctx?.adultContentEnabled) return items;
  return items.filter((item) => !isAdultSite(item.sourceSite));
}
