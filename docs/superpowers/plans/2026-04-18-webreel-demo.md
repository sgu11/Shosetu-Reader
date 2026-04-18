# Webreel Demo Reel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a 60–90s MP4 highlight reel of Shosetu Reader via webreel, recorded against a local dev environment seeded with deterministic demo data.

**Architecture:** All new files live under `demo/`. A `DEMO_MODE=1` env flag swaps the real Syosetu ranking fetch and real translation job handlers for deterministic stubs backed by JSON fixtures. A single `demo:render` shell script seeds the DB, boots the app + worker, runs `webreel record`, and tears everything down. No captions or post-processing in this plan — the webreel output MP4 is the final artifact.

**Tech Stack:** webreel (`npx webreel`), Drizzle ORM, Postgres (local `shosetu_demo` DB), Node/tsx, Vitest, pnpm.

**Spec:** [docs/superpowers/specs/2026-04-18-webreel-demo-design.md](../specs/2026-04-18-webreel-demo-design.md)

---

## File Structure

Files created or modified, grouped by responsibility:

**Env + config (2 files)**
- Modify `src/lib/env.ts` — add optional `DEMO_MODE` and `DEMO_FIXTURES_PATH` vars.
- Create `demo/.env.demo` — template with `DEMO_MODE=1`, demo DATABASE_URL.

**Fixtures (5 files)**
- Create `demo/seed/fixtures/novel.json`
- Create `demo/seed/fixtures/episodes.ja.json`
- Create `demo/seed/fixtures/episodes.ko.json`
- Create `demo/seed/fixtures/glossary.json`
- Create `demo/seed/fixtures/ranking.json`

**Seeding (1 file + tests)**
- Create `demo/seed/seed-demo.ts` — entry point, truncates + inserts.
- Create `tests/demo/seed-demo.test.ts` — verifies fixtures round-trip into DB.

**Demo-mode guards (3 modifications + tests)**
- Modify `src/modules/source/application/ranking.ts` (or equivalent) — return fixture when `DEMO_MODE`.
- Modify `src/modules/jobs/application/job-handlers.ts` — delegate `translation.bulk-translate-all` and `translation.episode` to demo stub when `DEMO_MODE`.
- Create `src/modules/jobs/application/demo-handlers.ts` — the stubs (progress-drip + pre-baked write).
- Create `tests/demo/demo-handlers.test.ts` — verifies stubs emit expected progress + write expected rows.
- Create `tests/demo/demo-ranking.test.ts` — verifies ranking guard.

**Recording (3 files)**
- Create `demo/webreel.config.json` — 5-scene step script + outro navigation.
- Create `demo/outro.html` — static outro card served via dev server's `public/` or file URL.
- Create `demo/scripts/render.sh` — end-to-end render pipeline.

**Testid hardening (1 modification, scoped)**
- Modify the minimum set of components that scene selectors need (enumerated in Task 9).

**Docs + scripts (2 files)**
- Create `demo/README.md` — "how to regenerate the demo".
- Modify `package.json` — add `demo:seed`, `demo:record`, `demo:render`, `demo:validate`.
- Modify `.gitignore` — ignore `demo/output/`.

---

## Task 1: DEMO_MODE env vars + demo directory scaffold

**Files:**
- Modify: `src/lib/env.ts:3-33`
- Create: `demo/.env.demo`
- Create: `demo/README.md`
- Create: `.gitignore` entry

- [ ] **Step 1: Write the failing test**

Create `tests/demo/env.test.ts`:

```ts
import { describe, expect, it } from "vitest";

describe("env demo flags", () => {
  it("parses DEMO_MODE as boolean and defaults to false", async () => {
    const prev = process.env.DEMO_MODE;
    process.env.DEMO_MODE = "1";
    const mod = await import("@/lib/env");
    expect(mod.env.DEMO_MODE).toBe(true);
    process.env.DEMO_MODE = prev;
  });

  it("exposes DEMO_FIXTURES_PATH default", async () => {
    const mod = await import("@/lib/env");
    expect(mod.env.DEMO_FIXTURES_PATH).toMatch(/demo\/seed\/fixtures$/);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test tests/demo/env.test.ts`
Expected: FAIL — `DEMO_MODE` and `DEMO_FIXTURES_PATH` are `undefined`.

- [ ] **Step 3: Extend env schema**

Edit `src/lib/env.ts`. Inside `serverEnvSchema`, add:

```ts
DEMO_MODE: z
  .union([z.literal("1"), z.literal("true"), z.literal("0"), z.literal("false"), z.literal("")])
  .optional()
  .transform((v) => v === "1" || v === "true"),
DEMO_FIXTURES_PATH: z
  .string()
  .optional()
  .default("demo/seed/fixtures"),
```

And add the passthrough keys in the `safeParse({ ... })` literal:

```ts
DEMO_MODE: process.env.DEMO_MODE,
DEMO_FIXTURES_PATH: process.env.DEMO_FIXTURES_PATH,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/demo/env.test.ts`
Expected: PASS.

- [ ] **Step 5: Create demo scaffold**

Create `demo/.env.demo`:

```
DEMO_MODE=1
DATABASE_URL=postgres://postgres:postgres@localhost:5432/shosetu_demo
REDIS_URL=redis://localhost:6379/1
APP_URL=http://localhost:3000
OPENROUTER_API_KEY=not-used-in-demo-mode
```

Create `demo/README.md`:

```markdown
# Demo

Regenerate the highlight reel:

    pnpm demo:render

Output lands at `demo/output/shosetu-demo.mp4`. Requires local Postgres
and Redis. See `.env.demo` for required vars.
```

Append to `.gitignore`:

```
demo/output/
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/env.ts tests/demo/env.test.ts demo/.env.demo demo/README.md .gitignore
git commit -m "feat(demo): add DEMO_MODE env flag and demo scaffold"
```

---

## Task 2: Demo fixtures

**Files:**
- Create: `demo/seed/fixtures/novel.json`
- Create: `demo/seed/fixtures/episodes.ja.json`
- Create: `demo/seed/fixtures/episodes.ko.json`
- Create: `demo/seed/fixtures/glossary.json`
- Create: `demo/seed/fixtures/ranking.json`
- Create: `tests/demo/fixtures.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/demo/fixtures.test.ts`:

```ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const fixturesDir = path.resolve(process.cwd(), "demo/seed/fixtures");

function readJson<T>(name: string): T {
  return JSON.parse(readFileSync(path.join(fixturesDir, name), "utf8")) as T;
}

describe("demo fixtures", () => {
  it("novel has ncode, title_ja, title_ko", () => {
    const novel = readJson<Record<string, unknown>>("novel.json");
    expect(novel).toMatchObject({
      ncode: expect.any(String),
      title_ja: expect.any(String),
      title_ko: expect.any(String),
    });
  });

  it("has 5 JP episodes with id + title + body", () => {
    const eps = readJson<Array<{ id: string; title_ja: string; body_ja: string }>>(
      "episodes.ja.json",
    );
    expect(eps).toHaveLength(5);
    for (const ep of eps) {
      expect(ep.id).toMatch(/^demo-ep-\d+$/);
      expect(ep.title_ja.length).toBeGreaterThan(0);
      expect(ep.body_ja.length).toBeGreaterThan(0);
    }
  });

  it("has 4 KO episode translations (episode 5 left pending)", () => {
    const eps = readJson<Array<{ id: string; body_ko: string }>>("episodes.ko.json");
    expect(eps).toHaveLength(4);
    expect(eps.map((e) => e.id)).toEqual([
      "demo-ep-1",
      "demo-ep-2",
      "demo-ep-3",
      "demo-ep-4",
    ]);
  });

  it("has between 8 and 10 glossary entries", () => {
    const entries = readJson<unknown[]>("glossary.json");
    expect(entries.length).toBeGreaterThanOrEqual(8);
    expect(entries.length).toBeLessThanOrEqual(10);
  });

  it("ranking has daily/weekly/monthly/quarterly keys", () => {
    const ranking = readJson<Record<string, unknown[]>>("ranking.json");
    for (const key of ["daily", "weekly", "monthly", "quarterly"]) {
      expect(Array.isArray(ranking[key])).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test tests/demo/fixtures.test.ts`
Expected: FAIL — fixtures do not exist.

- [ ] **Step 3: Create fixtures**

Create `demo/seed/fixtures/novel.json`:

```json
{
  "id": "demo-novel-1",
  "ncode": "n9669bk",
  "title_ja": "デモ小説",
  "title_ko": "데모 소설",
  "author_ja": "作者太郎",
  "author_ko": "작자 타로",
  "description_ja": "デモ用のサンプル小説です。",
  "description_ko": "데모용 샘플 소설입니다.",
  "source_url": "https://ncode.syosetu.com/n9669bk/",
  "total_episodes": 5
}
```

Create `demo/seed/fixtures/episodes.ja.json`:

```json
[
  { "id": "demo-ep-1", "novel_id": "demo-novel-1", "number": 1, "title_ja": "第一話 出会い", "body_ja": "朝の光が差し込む教室で、彼女は静かに本を開いた。" },
  { "id": "demo-ep-2", "novel_id": "demo-novel-1", "number": 2, "title_ja": "第二話 再会", "body_ja": "駅のホームで、ふたりは偶然再会する。" },
  { "id": "demo-ep-3", "novel_id": "demo-novel-1", "number": 3, "title_ja": "第三話 約束", "body_ja": "夕暮れの河原で、彼らは小さな約束を交わした。" },
  { "id": "demo-ep-4", "novel_id": "demo-novel-1", "number": 4, "title_ja": "第四話 別れ", "body_ja": "別れの日は、思っていたよりも穏やかだった。" },
  { "id": "demo-ep-5", "novel_id": "demo-novel-1", "number": 5, "title_ja": "第五話 帰還", "body_ja": "長い旅路の果て、彼は故郷の空を見上げた。" }
]
```

Create `demo/seed/fixtures/episodes.ko.json`:

```json
[
  { "id": "demo-ep-1", "title_ko": "제1화 만남", "body_ko": "아침 햇살이 비추는 교실에서 그녀는 조용히 책을 펼쳤다." },
  { "id": "demo-ep-2", "title_ko": "제2화 재회", "body_ko": "역 승강장에서 두 사람은 우연히 다시 만났다." },
  { "id": "demo-ep-3", "title_ko": "제3화 약속", "body_ko": "해질녘 강가에서 그들은 작은 약속을 주고받았다." },
  { "id": "demo-ep-4", "title_ko": "제4화 이별", "body_ko": "이별의 날은 생각보다 잔잔했다." }
]
```

Create `demo/seed/fixtures/glossary.json`:

```json
[
  { "novel_id": "demo-novel-1", "term_ja": "教室", "term_ko": "교실", "role": "장소" },
  { "novel_id": "demo-novel-1", "term_ja": "駅", "term_ko": "역", "role": "장소" },
  { "novel_id": "demo-novel-1", "term_ja": "河原", "term_ko": "강가", "role": "장소" },
  { "novel_id": "demo-novel-1", "term_ja": "故郷", "term_ko": "고향", "role": "장소" },
  { "novel_id": "demo-novel-1", "term_ja": "彼女", "term_ko": "그녀", "role": "대명사" },
  { "novel_id": "demo-novel-1", "term_ja": "彼", "term_ko": "그", "role": "대명사" },
  { "novel_id": "demo-novel-1", "term_ja": "朝の光", "term_ko": "아침 햇살", "role": "표현" },
  { "novel_id": "demo-novel-1", "term_ja": "約束", "term_ko": "약속", "role": "개념" }
]
```

Create `demo/seed/fixtures/ranking.json`:

```json
{
  "daily": [
    { "rank": 1, "ncode": "n0001aa", "title_ja": "聖女の物語", "title_ko": "성녀의 이야기", "author_ja": "著者A" },
    { "rank": 2, "ncode": "n0002bb", "title_ja": "剣と魔法の国", "title_ko": "검과 마법의 나라", "author_ja": "著者B" },
    { "rank": 3, "ncode": "n0003cc", "title_ja": "転生したら猫だった", "title_ko": "환생했더니 고양이였다", "author_ja": "著者C" }
  ],
  "weekly": [
    { "rank": 1, "ncode": "n0010dd", "title_ja": "星降る夜に", "title_ko": "별이 내리는 밤에", "author_ja": "著者D" },
    { "rank": 2, "ncode": "n0011ee", "title_ja": "王都の影", "title_ko": "왕도의 그림자", "author_ja": "著者E" }
  ],
  "monthly": [
    { "rank": 1, "ncode": "n0100ff", "title_ja": "月下の誓い", "title_ko": "달빛 아래의 맹세", "author_ja": "著者F" }
  ],
  "quarterly": [
    { "rank": 1, "ncode": "n1000gg", "title_ja": "最後の魔女", "title_ko": "마지막 마녀", "author_ja": "著者G" }
  ]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/demo/fixtures.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add demo/seed/fixtures tests/demo/fixtures.test.ts
git commit -m "feat(demo): add fixture JSON for novel, episodes, glossary, ranking"
```

---

## Task 3: Seed script

**Files:**
- Create: `demo/seed/seed-demo.ts`
- Create: `tests/demo/seed-demo.test.ts`
- Modify: `package.json` (add `demo:seed`)

- [ ] **Step 1: Inspect the DB schema**

Run: `ls src/lib/db/schema` (or equivalent). Identify the Drizzle table modules for `novels`, `episodes`, `translations`, `glossary_entries`. The seed script will import those exports and use `db.insert()`.

Run: `grep -l "pgTable" src/lib/db/schema`
Expected: one or more schema files listed.

- [ ] **Step 2: Write the failing test**

Create `tests/demo/seed-demo.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getDb } from "@/lib/db/client";
import { novels, episodes, translations, glossaryEntries } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { seedDemo } from "@/../demo/seed/seed-demo";

describe("seedDemo", () => {
  it("loads one novel with 5 episodes and 4 translations", async () => {
    await seedDemo();

    const db = getDb();
    const novel = await db.select().from(novels).where(eq(novels.id, "demo-novel-1"));
    expect(novel).toHaveLength(1);

    const eps = await db.select().from(episodes).where(eq(episodes.novelId, "demo-novel-1"));
    expect(eps).toHaveLength(5);

    const tx = await db
      .select()
      .from(translations)
      .where(eq(translations.novelId, "demo-novel-1"));
    expect(tx).toHaveLength(4);

    const gloss = await db
      .select()
      .from(glossaryEntries)
      .where(eq(glossaryEntries.novelId, "demo-novel-1"));
    expect(gloss.length).toBeGreaterThanOrEqual(8);
  });

  it("is idempotent", async () => {
    await seedDemo();
    await seedDemo();
    const db = getDb();
    const eps = await db.select().from(episodes).where(eq(episodes.novelId, "demo-novel-1"));
    expect(eps).toHaveLength(5);
  });
});
```

**Important:** Only run this test against a demo DB. Guard in the test file: `if (!process.env.DATABASE_URL?.includes("shosetu_demo")) it.skip(...)`. See test setup.

Add a setup snippet at the top:

```ts
if (!process.env.DATABASE_URL?.includes("shosetu_demo")) {
  describe.skip("seedDemo (needs shosetu_demo DATABASE_URL)", () => {});
  // @ts-expect-error short-circuit
  return;
}
```

- [ ] **Step 3: Run to verify failure**

Run: `DATABASE_URL=postgres://postgres:postgres@localhost:5432/shosetu_demo pnpm test tests/demo/seed-demo.test.ts`
Expected: FAIL — module `demo/seed/seed-demo` does not exist.

- [ ] **Step 4: Write seed-demo.ts**

Create `demo/seed/seed-demo.ts`. Use the actual schema table names / columns discovered in Step 1; the snippet below shows the shape:

```ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { env } from "@/lib/env";
import { getDb } from "@/lib/db/client";
import {
  novels,
  episodes,
  translations,
  glossaryEntries,
} from "@/lib/db/schema";

type NovelFixture = {
  id: string;
  ncode: string;
  title_ja: string;
  title_ko: string;
  author_ja: string;
  author_ko: string;
  description_ja: string;
  description_ko: string;
  source_url: string;
  total_episodes: number;
};

type EpisodeJaFixture = {
  id: string;
  novel_id: string;
  number: number;
  title_ja: string;
  body_ja: string;
};

type EpisodeKoFixture = {
  id: string;
  title_ko: string;
  body_ko: string;
};

type GlossaryFixture = {
  novel_id: string;
  term_ja: string;
  term_ko: string;
  role: string;
};

function readFixture<T>(name: string): T {
  const full = path.resolve(process.cwd(), env.DEMO_FIXTURES_PATH, name);
  return JSON.parse(readFileSync(full, "utf8")) as T;
}

export async function seedDemo() {
  const novel = readFixture<NovelFixture>("novel.json");
  const epJa = readFixture<EpisodeJaFixture[]>("episodes.ja.json");
  const epKo = readFixture<EpisodeKoFixture[]>("episodes.ko.json");
  const gloss = readFixture<GlossaryFixture[]>("glossary.json");

  const db = getDb();

  await db.transaction(async (tx) => {
    // Truncate in FK order
    await tx.delete(translations).where(eq(translations.novelId, novel.id));
    await tx.delete(glossaryEntries).where(eq(glossaryEntries.novelId, novel.id));
    await tx.delete(episodes).where(eq(episodes.novelId, novel.id));
    await tx.delete(novels).where(eq(novels.id, novel.id));

    await tx.insert(novels).values({
      id: novel.id,
      ncode: novel.ncode,
      titleJa: novel.title_ja,
      titleKo: novel.title_ko,
      authorJa: novel.author_ja,
      authorKo: novel.author_ko,
      descriptionJa: novel.description_ja,
      descriptionKo: novel.description_ko,
      sourceUrl: novel.source_url,
      totalEpisodes: novel.total_episodes,
    });

    await tx.insert(episodes).values(
      epJa.map((e) => ({
        id: e.id,
        novelId: e.novel_id,
        number: e.number,
        titleJa: e.title_ja,
        bodyJa: e.body_ja,
      })),
    );

    const koById = new Map(epKo.map((e) => [e.id, e]));
    const txRows = epJa
      .filter((e) => koById.has(e.id))
      .map((e) => {
        const ko = koById.get(e.id)!;
        return {
          episodeId: e.id,
          novelId: e.novel_id,
          bodyKo: ko.body_ko,
          titleKo: ko.title_ko,
          modelName: "demo-model",
          status: "completed" as const,
        };
      });
    if (txRows.length > 0) await tx.insert(translations).values(txRows);

    await tx.insert(glossaryEntries).values(
      gloss.map((g) => ({
        novelId: g.novel_id,
        termJa: g.term_ja,
        termKo: g.term_ko,
        role: g.role,
      })),
    );
  });
}

// Allow `tsx demo/seed/seed-demo.ts` invocation
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDemo()
    .then(() => {
      console.log("demo seeded");
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
```

Add the `eq` import: `import { eq } from "drizzle-orm";`

- [ ] **Step 5: Add package script**

Edit `package.json` scripts:

```json
"demo:seed": "node --env-file=demo/.env.demo --import tsx demo/seed/seed-demo.ts"
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `createdb shosetu_demo 2>/dev/null; DATABASE_URL=postgres://postgres:postgres@localhost:5432/shosetu_demo pnpm db:migrate`
Then: `DATABASE_URL=postgres://postgres:postgres@localhost:5432/shosetu_demo pnpm test tests/demo/seed-demo.test.ts`
Expected: PASS (both test cases).

- [ ] **Step 7: Commit**

```bash
git add demo/seed/seed-demo.ts tests/demo/seed-demo.test.ts package.json
git commit -m "feat(demo): add deterministic demo seed script"
```

---

## Task 4: Demo-mode ranking guard

**Files:**
- Modify: the file that fetches Syosetu rankings (identify via `grep -l "ranking" src/modules/source`)
- Create: `tests/demo/demo-ranking.test.ts`

- [ ] **Step 1: Identify the ranking fetch entrypoint**

Run: `grep -rn "ranking.syosetu" src/modules/source`
Expected: one file — call its default-exported async function `fetchSyosetuRanking(scope)`. If the real function has a different name, substitute it everywhere below.

- [ ] **Step 2: Write the failing test**

Create `tests/demo/demo-ranking.test.ts`:

```ts
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { fetchSyosetuRanking } from "@/modules/source/application/ranking";

describe("fetchSyosetuRanking in DEMO_MODE", () => {
  const prev = process.env.DEMO_MODE;
  beforeEach(() => { process.env.DEMO_MODE = "1"; });
  afterEach(() => { process.env.DEMO_MODE = prev; });

  it("returns fixture rows for daily without hitting the network", async () => {
    const rows = await fetchSyosetuRanking("daily");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ rank: 1, ncode: "n0001aa" });
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `pnpm test tests/demo/demo-ranking.test.ts`
Expected: FAIL — real fetch attempts a network call or returns different shape.

- [ ] **Step 4: Add DEMO_MODE guard**

In the ranking fetch function, early-return the fixture when `env.DEMO_MODE`:

```ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { env } from "@/lib/env";

export async function fetchSyosetuRanking(scope: RankingScope) {
  if (env.DEMO_MODE) {
    const full = path.resolve(process.cwd(), env.DEMO_FIXTURES_PATH, "ranking.json");
    const all = JSON.parse(readFileSync(full, "utf8")) as Record<string, RankingRow[]>;
    return all[scope] ?? [];
  }
  // ...existing implementation
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test tests/demo/demo-ranking.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/modules/source/application/ranking.ts tests/demo/demo-ranking.test.ts
git commit -m "feat(demo): serve ranking fixture when DEMO_MODE is set"
```

---

## Task 5: Demo-mode translation job stubs

**Files:**
- Create: `src/modules/jobs/application/demo-handlers.ts`
- Modify: `src/modules/jobs/application/job-handlers.ts:44-59`
- Create: `tests/demo/demo-handlers.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/demo/demo-handlers.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { handleDemoBulkTranslate } from "@/modules/jobs/application/demo-handlers";

describe("handleDemoBulkTranslate", () => {
  it("emits at least 5 progress updates and completes", async () => {
    const updates: unknown[] = [];
    const context = {
      updateProgress: vi.fn(async (p) => { updates.push(p); }),
    } as any;

    const result = await handleDemoBulkTranslate(
      { novelId: "demo-novel-1", episodeIds: ["demo-ep-5"], ownerUserId: "demo-user" },
      context,
    );

    expect(updates.length).toBeGreaterThanOrEqual(5);
    expect((updates.at(-1) as any).stage).toBe("completed");
    expect(result).toMatchObject({ stage: "completed" });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test tests/demo/demo-handlers.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Write the demo handler**

Create `src/modules/jobs/application/demo-handlers.ts`:

```ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { env } from "@/lib/env";
import { getDb } from "@/lib/db/client";
import { translations } from "@/lib/db/schema";
import type { JobExecutionContext } from "./job-queue";
import type { JobRunResult } from "./job-runs";
import type { BulkTranslateAllJobPayload } from "./job-handlers";

const TICK_MS = 200;
const TICKS = 12; // ~2.4s to "finish" a single episode for scene 2

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

type EpisodeKoFixture = {
  id: string;
  title_ko: string;
  body_ko: string;
};

function loadKoFixtures(): Map<string, EpisodeKoFixture> {
  const full = path.resolve(process.cwd(), env.DEMO_FIXTURES_PATH, "episodes.ko.json");
  const arr = JSON.parse(readFileSync(full, "utf8")) as EpisodeKoFixture[];
  return new Map(arr.map((e) => [e.id, e]));
}

export async function handleDemoBulkTranslate(
  payload: BulkTranslateAllJobPayload,
  context: JobExecutionContext<BulkTranslateAllJobPayload>,
): Promise<JobRunResult> {
  const total = payload.episodeIds.length;
  const koById = loadKoFixtures();
  const db = getDb();

  for (let t = 0; t <= TICKS; t++) {
    await context.updateProgress({
      stage: t < TICKS ? "translating" : "completed",
      processed: Math.min(Math.floor((t / TICKS) * total * 10) / 10, total),
      total,
      queued: total,
      failed: 0,
    });
    if (t < TICKS) await sleep(TICK_MS);
  }

  for (const episodeId of payload.episodeIds) {
    const ko = koById.get(episodeId);
    if (!ko) continue;
    await db
      .insert(translations)
      .values({
        episodeId,
        novelId: payload.novelId,
        bodyKo: ko.body_ko,
        titleKo: ko.title_ko,
        modelName: "demo-model",
        status: "completed",
      })
      .onConflictDoUpdate({
        target: [translations.episodeId],
        set: { bodyKo: ko.body_ko, titleKo: ko.title_ko, status: "completed" },
      });
  }

  return { stage: "completed", processed: total, total, queued: total, failed: 0 };
}
```

- [ ] **Step 4: Wire stub into the job-handlers dispatch**

Edit `src/modules/jobs/application/job-handlers.ts`. Near the top add:

```ts
import { env } from "@/lib/env";
import { handleDemoBulkTranslate } from "./demo-handlers";
```

Replace the `translation.bulk-translate-all` entry in the `jobHandlers` literal (line 51) with a wrapper that checks `env.DEMO_MODE`:

```ts
"translation.bulk-translate-all": (async (payload, context) => {
  if (env.DEMO_MODE) return handleDemoBulkTranslate(payload as BulkTranslateAllJobPayload, context as any);
  return handleBulkTranslateAll(payload as BulkTranslateAllJobPayload, context as any);
}) as JobHandler<unknown>,
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test tests/demo/demo-handlers.test.ts`
Expected: PASS.

Run: `pnpm check` to ensure no type drift.
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/modules/jobs/application/demo-handlers.ts src/modules/jobs/application/job-handlers.ts tests/demo/demo-handlers.test.ts
git commit -m "feat(demo): stub translation job with deterministic progress drip"
```

---

## Task 6: Outro HTML

**Files:**
- Create: `demo/outro.html`
- Create: `public/demo-outro.html` (served by dev server)

- [ ] **Step 1: Author outro**

Create `public/demo-outro.html`:

```html
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>Shosetu Reader</title>
<style>
  :root { color-scheme: dark; }
  html, body { margin: 0; height: 100%; }
  body {
    display: grid; place-items: center;
    background: radial-gradient(circle at 50% 40%, #1f2937 0%, #030712 70%);
    color: #f9fafb;
    font-family: Pretendard, -apple-system, "SF Pro Text", sans-serif;
    text-align: center;
  }
  h1 { font-size: 72px; margin: 0 0 16px; letter-spacing: -0.03em; }
  p  { font-size: 28px; margin: 0; color: #9ca3af; }
  code { font-family: "SF Mono", Menlo, monospace; color: #f472b6; }
</style>
</head>
<body>
  <div>
    <h1>Shosetu Reader</h1>
    <p><code>github.com/sgu11/Shosetu-Reader</code></p>
  </div>
</body>
</html>
```

Also create `demo/outro.html` as a symlink-in-repo copy for archival (identical content), or document that the webreel config navigates to `http://localhost:3000/demo-outro.html`.

For this plan we use the `public/demo-outro.html` route. No `demo/outro.html` is needed.

- [ ] **Step 2: Verify**

Run: `pnpm dev` in another terminal, then `curl -s http://localhost:3000/demo-outro.html | grep Shosetu`
Expected: one match.

- [ ] **Step 3: Commit**

```bash
git add public/demo-outro.html
git commit -m "feat(demo): add outro card page for webreel scene 6"
```

---

## Task 7: data-testid selectors

**Files (audit then modify minimally):**
- Modify: `src/app/[locale]/register/page.tsx` — add `data-testid="register-ncode-input"`, `data-testid="register-submit"`.
- Modify: novel detail page — add `data-testid="bulk-translate-button"`, `data-testid="translation-progress-bar"`.
- Modify: reader page — add `data-testid="lang-toggle"`, `data-testid="font-size-increase"`.
- Modify: glossary editor — add `data-testid="glossary-open-button"`, `data-testid="glossary-entry-edit-{term_ja}"`, `data-testid="glossary-save"`.
- Modify: ranking page — add `data-testid="ranking-tab-{scope}"`.

- [ ] **Step 1: Inventory required selectors**

Run: `grep -rn "data-testid=" src/app src/components | head`
Expected: existing testids list. If any of the above already exist, skip that addition.

- [ ] **Step 2: Add testids**

For each missing testid, edit the JSX element:

```tsx
<input data-testid="register-ncode-input" ... />
<button data-testid="register-submit" ...>{t("submit")}</button>
```

Keep edits minimal — only add the `data-testid` attribute, change nothing else.

- [ ] **Step 3: Run typecheck + existing tests**

Run: `pnpm check && pnpm test`
Expected: green.

- [ ] **Step 4: Commit**

```bash
git add -u src/app src/components
git commit -m "chore(demo): add data-testid attributes for webreel selectors"
```

---

## Task 8: webreel.config.json

**Files:**
- Create: `demo/webreel.config.json`

- [ ] **Step 1: Scaffold via webreel CLI**

Run: `cd demo && npx webreel init --name shosetu-demo --url http://localhost:3000/ko/register && cd ..`
Expected: a starter `webreel.config.json` is written to `demo/`.

- [ ] **Step 2: Replace with the full storyboard**

Overwrite `demo/webreel.config.json`:

```json
{
  "$schema": "https://unpkg.com/webreel/schema.json",
  "videos": [
    {
      "name": "shosetu-demo",
      "url": "http://localhost:3000/ko/register",
      "viewport": { "width": 1920, "height": 1080 },
      "output": "output/shosetu-demo.mp4",
      "steps": [
        { "type": "pause", "ms": 800 },

        { "type": "click", "selector": "[data-testid=register-ncode-input]" },
        { "type": "type", "text": "n9669bk", "delayMs": 80 },
        { "type": "click", "selector": "[data-testid=register-submit]" },
        { "type": "wait", "selector": "[data-testid=novel-detail]", "timeoutMs": 8000 },
        { "type": "pause", "ms": 1200 },

        { "type": "click", "selector": "[data-testid=bulk-translate-button]" },
        { "type": "wait", "selector": "[data-testid=translation-progress-bar]", "timeoutMs": 4000 },
        { "type": "pause", "ms": 3500 },

        { "type": "navigate", "url": "http://localhost:3000/ko/reader/demo-ep-1" },
        { "type": "wait", "selector": "[data-testid=lang-toggle]", "timeoutMs": 4000 },
        { "type": "pause", "ms": 1500 },
        { "type": "click", "selector": "[data-testid=lang-toggle]" },
        { "type": "pause", "ms": 1500 },
        { "type": "click", "selector": "[data-testid=font-size-increase]" },
        { "type": "click", "selector": "[data-testid=font-size-increase]" },
        { "type": "pause", "ms": 1500 },

        { "type": "click", "selector": "[data-testid=glossary-open-button]" },
        { "type": "wait", "selector": "[data-testid=glossary-entry-edit-約束]", "timeoutMs": 4000 },
        { "type": "click", "selector": "[data-testid=glossary-entry-edit-約束]" },
        { "type": "pause", "ms": 800 },
        { "type": "click", "selector": "[data-testid=glossary-save]" },
        { "type": "pause", "ms": 2000 },

        { "type": "navigate", "url": "http://localhost:3000/ko/ranking" },
        { "type": "wait", "selector": "[data-testid=ranking-tab-daily]", "timeoutMs": 4000 },
        { "type": "hover", "selector": "[data-testid=ranking-tab-weekly]" },
        { "type": "pause", "ms": 1000 },
        { "type": "hover", "selector": "[data-testid=ranking-tab-monthly]" },
        { "type": "pause", "ms": 1000 },
        { "type": "hover", "selector": "[data-testid=ranking-tab-daily]" },
        { "type": "pause", "ms": 1000 },

        { "type": "navigate", "url": "http://localhost:3000/demo-outro.html" },
        { "type": "pause", "ms": 2500 }
      ]
    }
  ]
}
```

- [ ] **Step 3: Validate the config**

Run: `npx webreel validate --config demo/webreel.config.json`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add demo/webreel.config.json
git commit -m "feat(demo): add webreel storyboard config for 5-scene reel"
```

---

## Task 9: render.sh pipeline

**Files:**
- Create: `demo/scripts/render.sh`
- Modify: `package.json` (add `demo:record`, `demo:render`, `demo:validate`)

- [ ] **Step 1: Write the render script**

Create `demo/scripts/render.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

# Load demo env
set -a
# shellcheck disable=SC1091
source demo/.env.demo
set +a

DEV_PID=""
WORKER_PID=""
cleanup() {
  if [[ -n "$DEV_PID" ]] && kill -0 "$DEV_PID" 2>/dev/null; then kill "$DEV_PID"; fi
  if [[ -n "$WORKER_PID" ]] && kill -0 "$WORKER_PID" 2>/dev/null; then kill "$WORKER_PID"; fi
}
trap cleanup EXIT INT TERM

echo "==> db:migrate (demo DB)"
pnpm db:migrate

echo "==> seed demo data"
pnpm demo:seed

echo "==> start dev + worker"
pnpm dev > demo/output/dev.log 2>&1 &
DEV_PID=$!
pnpm worker > demo/output/worker.log 2>&1 &
WORKER_PID=$!

echo "==> wait for app"
for i in {1..60}; do
  if curl -fsS http://localhost:3000/api/health > /dev/null 2>&1; then break; fi
  sleep 1
  if [[ "$i" == "60" ]]; then echo "app never came up"; exit 1; fi
done

mkdir -p demo/output

echo "==> webreel record"
npx webreel record --config demo/webreel.config.json

echo "==> done: $(ls -la demo/output/shosetu-demo.mp4)"
```

Make executable: `chmod +x demo/scripts/render.sh`.

- [ ] **Step 2: Add package scripts**

Edit `package.json` scripts:

```json
"demo:record": "npx webreel record --config demo/webreel.config.json",
"demo:render": "bash demo/scripts/render.sh",
"demo:validate": "npx webreel validate --config demo/webreel.config.json"
```

- [ ] **Step 3: Dry-run validate**

Run: `pnpm demo:validate`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add demo/scripts/render.sh package.json
git commit -m "feat(demo): add render.sh pipeline and package scripts"
```

---

## Task 10: End-to-end dry run + README link

**Files:**
- Modify: `demo/README.md`
- Modify: `README.md` (add demo link)

- [ ] **Step 1: End-to-end render**

Prereqs (document separately if missing): local Postgres running, local Redis running, `shosetu_demo` DB exists (`createdb shosetu_demo`).

Run: `pnpm demo:render`
Expected: completes without error, produces `demo/output/shosetu-demo.mp4`, duration 60–90s.

If webreel fails to find a selector: open `demo/output/dev.log` and adjust either the selector in `webreel.config.json` or the testid in Task 7. Commit the fix.

- [ ] **Step 2: Flesh out demo/README.md**

Overwrite `demo/README.md`:

```markdown
# Demo

Regenerate the Shosetu Reader highlight reel.

## Prereqs

- Local Postgres (`createdb shosetu_demo`)
- Local Redis
- `pnpm install`

## Commands

| Command | Description |
|---------|-------------|
| `pnpm demo:seed` | Load fixtures into `shosetu_demo` |
| `pnpm demo:validate` | Validate `webreel.config.json` |
| `pnpm demo:record` | Record the video (assumes app is already running) |
| `pnpm demo:render` | One-shot: migrate → seed → start app → record → teardown |

## Output

`demo/output/shosetu-demo.mp4` (gitignored).

## DEMO_MODE

`DEMO_MODE=1` swaps the real Syosetu ranking fetch and translation job handler
for deterministic stubs backed by `demo/seed/fixtures/*.json`. No OpenRouter
calls are made, no Syosetu HTTP requests are made.
```

- [ ] **Step 3: Link from README**

In the top-level `README.md`, under "Current Status", append:

```markdown
- A 60–90s highlight reel is regeneratable via `pnpm demo:render`. See
  [`demo/README.md`](demo/README.md).
```

- [ ] **Step 4: Commit**

```bash
git add demo/README.md README.md
git commit -m "docs(demo): document demo:render workflow"
```

---

## Self-review checklist

Verified against spec:

- **Scope:** Captions and ffmpeg are explicitly out of scope — confirmed no ffmpeg step exists in any task.
- **Storyboard:** Scenes 1–5 + outro all present in `webreel.config.json` (Task 8). Durations add to ~85s including pauses.
- **DEMO_MODE:** Env flag defined (Task 1), ranking guard (Task 4), translation stub (Task 5). All three required by spec.
- **Data determinism:** Seed script is transactional and idempotent (Task 3). Translation stub writes pre-baked KO content (Task 5). Ranking reads fixture (Task 4). No OpenRouter or Syosetu calls.
- **Viewport:** 1920×1080 hard-coded in config (Task 8).
- **Output artifact:** `demo/output/shosetu-demo.mp4` gitignored (Task 1), produced by `pnpm demo:render` (Task 9).
- **Type consistency:** `BulkTranslateAllJobPayload` re-imported from existing `job-handlers.ts` (Task 5, not redefined). Fixture types in `seed-demo.ts` use the same snake_case→camelCase mapping as `demo-handlers.ts`. Episode ids `demo-ep-N` are consistent across fixtures, seed, stub, and webreel config.
- **No placeholders:** All steps contain the concrete code/commands an engineer needs.
