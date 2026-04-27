/**
 * Canary live-fetch for non-API novel sources. Hits one canonical URL per
 * source whose adapter is HTML-scraping (kakuyomu, alphapolis) and verifies
 * the parser still returns plausible data. Run on a schedule — not in CI —
 * so an upstream HTML/Apollo schema change reliably opens an issue before
 * users see a 500.
 *
 * Usage: `pnpm tsx scripts/canary-source-fetch.ts`
 *
 * Exit codes:
 *   0 — every probe succeeded
 *   1 — at least one probe failed; CI-style cron should fail loudly
 */

import { kakuyomuAdapter } from "../src/modules/source/infra/kakuyomu-adapter";
import { alphapolisAdapter } from "../src/modules/source/infra/alphapolis-adapter";
import type { SourceAdapter } from "../src/modules/source/domain/source-adapter";

interface Probe {
  label: string;
  run: () => Promise<{ ok: boolean; detail: string }>;
}

function metadataProbe(adapter: SourceAdapter, id: string): Probe {
  return {
    label: `${adapter.site}.fetchNovelMetadata(${id})`,
    run: async () => {
      const meta = await adapter.fetchNovelMetadata(id);
      const failures: string[] = [];
      if (!meta.title) failures.push("missing title");
      if (!meta.authorName) failures.push("missing authorName");
      if (failures.length > 0) {
        return { ok: false, detail: failures.join(", ") };
      }
      return {
        ok: true,
        detail: `title=${JSON.stringify(meta.title.slice(0, 30))} episodes=${meta.totalEpisodes ?? "?"}`,
      };
    },
  };
}

function rankingProbe(adapter: SourceAdapter): Probe {
  const period = adapter.supportedPeriods[0];
  return {
    label: `${adapter.site}.fetchRanking(${period})`,
    run: async () => {
      const items = await adapter.fetchRanking(period, 5);
      if (items.length === 0) {
        return { ok: false, detail: "ranking returned 0 items" };
      }
      const empties = items.filter((i) => !i.id || !i.title).length;
      if (empties > 0) {
        return { ok: false, detail: `${empties} items missing id/title` };
      }
      return { ok: true, detail: `${items.length} items, top=${JSON.stringify(items[0].title.slice(0, 30))}` };
    },
  };
}

const probes: Probe[] = [
  // kakuyomu — pick a stable, long-running ranked work; the canary doesn't
  // depend on the work being a specific ID, only that the parser survives.
  metadataProbe(kakuyomuAdapter, "16816452221074480581"),
  rankingProbe(kakuyomuAdapter),

  // alphapolis — a long-running ranked work likely to exist for a while.
  metadataProbe(alphapolisAdapter, "101715426/813048051"),
  rankingProbe(alphapolisAdapter),
];

async function main() {
  let failures = 0;
  for (const probe of probes) {
    const startedAt = Date.now();
    try {
      const result = await probe.run();
      const ms = Date.now() - startedAt;
      if (result.ok) {
        console.log(`[canary] ok ${probe.label} (${ms}ms): ${result.detail}`);
      } else {
        failures++;
        console.error(`[canary] FAIL ${probe.label} (${ms}ms): ${result.detail}`);
      }
    } catch (err) {
      failures++;
      const ms = Date.now() - startedAt;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[canary] FAIL ${probe.label} (${ms}ms): ${message}`);
    }
  }
  if (failures > 0) {
    console.error(`[canary] ${failures} probe(s) failed`);
    process.exit(1);
  }
  console.log(`[canary] all ${probes.length} probe(s) passed`);
}

main().catch((err) => {
  console.error("[canary] runner crashed", err);
  process.exit(1);
});
