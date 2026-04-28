# Shosetu Reader

**English** · [한국어](README.ko.md)

A modular-monolith reading platform for Japanese web novels with JP→KR
translation. Four sources behind one adapter abstraction
([Syosetu](https://syosetu.com/), [Nocturne](https://novel18.syosetu.com/),
[Kakuyomu](https://kakuyomu.jp/), [AlphaPolis](https://www.alphapolis.co.jp/)).
Stack: Next.js 16, PostgreSQL 16, Redis-backed background jobs, OpenRouter for
translation.

## Current Status

V1–V4 shipped. V5 substantially shipped: multi-source adapters, EPUB export,
quality dashboards, glossary cold-start (3 stages), big-novel pipeline
safeguards, editorial × cozy paper UI, SSE foundation. Site-design hi-fi pass
(phases 1–9) shipped — typographic masthead, source pills, KR-primary ranking,
bilingual KO·JA reader (.para-pair), 3-pane reader (TOC + body + glossary),
sticky settings rail with per-workload model picker.

DeepSeek V4 best-practice routing live: prefix-cache hits, per-workload
reasoning effort, provider pinning, paragraph-strict default prompt.

See [`docs/progress.md`](docs/progress.md) for the full snapshot.

## Features

- **Multi-source registration** via URL or bare ID — Syosetu, Nocturne (R-18),
  Kakuyomu, AlphaPolis. Live URL detection on the register page.
- **Source-grouped ranking** with per-source fan-out, R-18 pill, status pulse
  dot, source-color tab swatches.
- **Adult-content gate** at the application layer. Anonymous sessions always
  SFW; cache split via `Vary: Cookie`.
- **Episode ingestion** with batch ingest, full ingest, full re-ingest, and a
  capped per-run safeguard for 1000+ episode novels.
- **Web reader** with JA / KO / KO·JA tri-state toggle. KO·JA renders Korean
  paragraph over Japanese paragraph with a hairline rule (.para-pair).
- **3-pane reader** — TOC sidebar (±10 episodes around current), body, glossary
  drawer with rounded border.
- **Translation pipeline** via OpenRouter with **per-workload model + reasoning
  + max-tokens overrides**. DeepSeek-family requests pin to the DeepSeek
  provider so prefix-stable prompts hit the KV cache (~50× cheaper input).
- **V3 translation engine** with structured glossary (cap 500 entries), context
  chaining across episodes, adaptive chunking, quality validation, deferred
  glossary mutation during active sessions for cache stability.
- **Live episode updates** for ingestion + translation. SSE foundation for
  episode events.
- **Stop button** halts queued background work per novel — cancels active
  session, marks queued job_runs as failed with `cancelled by user`, marks
  queued/processing translations as failed.
- **Manual KO title override** per episode (handles content-safety refusals).
- **Multi-user profiles** with guest data migration and per-user settings.
- **Personal library** with subscriptions, progress, continue-reading, KO+JA
  stacked titles, inline sync/continue actions.
- **Per-novel glossary & style guide** with auto-extract, cold-start bootstrap
  (JA-only morph mining + LLM), Stage-2 auto-promote, Stage-3 review UI for
  weakened-confidence entries.
- **Cost tracking** across translate / glossary / extract / session rollups.
  `prompt_cache_hit_tokens`, `prompt_cache_miss_tokens`, `reasoning_tokens`
  surfaced per operation+model.
- **EPUB export** with streaming JSZip and a 3000-episode cap.
- **Dark / light / system theme**, theme-card preview swatches, sticky settings
  rail with KO/EN nav doublets.
- **Bilingual UI** (English / Korean) with cookie-based locale persistence.
- **Operational APIs** for job health, queue metrics, translation quality, and
  model throughput.

## Performance

- **Fetch timeouts** — every outbound call uses `AbortSignal.timeout` (15–30s
  metadata, 60–180s translation).
- **OpenRouter models cache** — Redis-backed, 1h TTL, stale-while-revalidate.
  Pre-warmed via `src/instrumentation.ts`.
- **DeepSeek prefix-cache exploitation** — system prompt + glossary listing
  byte-stable across episodes within a session, so episodes 2..N hit the
  cache. Auto-promote and per-episode glossary mutations are deferred during
  active sessions and consolidated in a single `glossary.refresh` job at
  session end.
- **Provider pinning** — `provider: { only: ["DeepSeek"] }` for `deepseek/*`
  models so OpenRouter doesn't route to a fallback host outside the cache
  domain.
- **Per-workload reasoning** — translate / title / summary run reasoning OFF;
  extraction LOW; compare / bootstrap HIGH.
- **Bulk-translate progress throttling** — ~1% intervals (500ms floor).
- **Title translation parallelism** — bounded concurrency 3.
- **HTTP caching on shared GETs** — `s-maxage=300, swr=1800`.
- **Big-novel safeguards** — paginated episode list, projected EPUB column
  reads, capped per-run ingest, parallelized live-status, partial-index on
  `translations(episode_id) WHERE target_language='ko'`.

## Stack

- **Framework**: Next.js 16 (App Router) + TypeScript
- **Styling**: Tailwind CSS 4 with `data-theme` (paper / sepia / night / system)
- **Database**: Drizzle ORM + PostgreSQL 16
- **Queue**: Redis-backed durable job queue with a dedicated worker
- **Translation**: OpenRouter (OpenAI-compatible), DeepSeek V4 default
- **Validation**: Zod
- **Testing**: Vitest + Playwright smoke
- **Deployment**: Docker Compose
- **Package manager**: pnpm

## Quick Start (Local)

```bash
cp .env.example .env    # fill in DATABASE_URL, OPENROUTER_API_KEY
pnpm install
pnpm db:migrate
pnpm dev                # app on http://localhost:3000
pnpm worker             # background jobs
```

PostgreSQL + Redis must be running on `localhost`. Async ingest and translation
require the worker process.

## Production (Docker)

```bash
cp .env.example .env.production   # fill in secrets
docker compose up -d --build      # app + worker + db + redis on port 3000
```

Migrations run automatically on container start.

## Environment

The full schema lives in `.env.example`. The `OPENROUTER_*` knobs are layered:

```
user.workloadOverrides[workload]  ← Settings → Translation page
  → OPENROUTER_${WORKLOAD}_MODEL  ← .env per-workload override
    → OPENROUTER_DEFAULT_MODEL    ← .env global default
```

| Variable | Default | Notes |
|----------|---------|-------|
| `OPENROUTER_DEFAULT_MODEL` | `deepseek/deepseek-v4-flash` | Fallback for any workload without an explicit override. |
| `OPENROUTER_TRANSLATE_MODEL` | inherit | Episode body translation. |
| `OPENROUTER_TITLE_MODEL` | inherit | Title batches (ranking, episode lists). |
| `OPENROUTER_SUMMARY_MODEL` | inherit | Rolling session context summary. |
| `OPENROUTER_EXTRACTION_MODEL` | inherit | Per-episode JSON glossary extract. |
| `OPENROUTER_COMPARE_MODEL` | inherit | Comparison / retranslation. |
| `OPENROUTER_BOOTSTRAP_MODEL` | inherit | Cold-start glossary mining. |
| `OPENROUTER_REASONING_${WORKLOAD}` | per-workload | `off` / `low` / `high` / `xhigh`. Translate / title / summary default `off`; extraction `low`; compare / bootstrap `high`. |
| `OPENROUTER_MAX_TOKENS_${WORKLOAD}` | per-workload | translate=4096, title=1024, summary=2048, extraction=4096, compare=8192, bootstrap=8192. |
| `OPENROUTER_PROVIDER_PIN` | `DeepSeek` for `deepseek/*` | Comma-separated. Empty disables auto-pin. |
| `GLOSSARY_MAX_PROMPT_ENTRIES` | `500` | Confirmed entries injected into translate prompts. |
| `TRANSLATION_COST_BUDGET_USD` | unset | Auto-pause sessions on overspend. |
| `ADMIN_API_KEY` | unset | Required in prod for `/api/admin/*`. |

DeepSeek V4 best-practice pairing (already in `.env.example`):

```
OPENROUTER_TRANSLATE_MODEL=deepseek/deepseek-v4-flash    # output cost dominates
OPENROUTER_TITLE_MODEL=deepseek/deepseek-v4-flash
OPENROUTER_SUMMARY_MODEL=deepseek/deepseek-v4-flash
OPENROUTER_EXTRACTION_MODEL=deepseek/deepseek-v4-flash
OPENROUTER_COMPARE_MODEL=deepseek/deepseek-v4-pro        # quality-sensitive
OPENROUTER_BOOTSTRAP_MODEL=deepseek/deepseek-v4-pro
```

## Best-practice global translation prompt

The prompt below ships as the default in `src/modules/translation/domain/default-prompt.ts`.
Two non-negotiables drive its shape:

1. The reader's bilingual KO·JA mode (`.para-pair`) and ComparePane both
   pair source and translation by **splitting on `\n` and zipping by
   index**. Any merge / split / blank-line drift breaks every downstream
   paragraph from the drift point onward → paragraph-structure runs
   first and uses the strongest language.
2. Onomatopoeia, honorifics, dialogue brackets, and skill-name glosses
   historically introduced new linebreaks. Each rule that touches text
   layout reasserts the no-linebreak constraint inline.

Drop in via Settings → Translation → "Global translation prompt", or set
your own and start from this skeleton:

````markdown
# 일본 웹소설 한국어 번역 가이드라인

## 문단 구조 — 최우선 규칙
이 시스템은 원문과 번역문을 줄바꿈(\n) 기준 인덱스 매칭으로 정렬합니다.
- 문단 수 일치: 원문 N문단 → 번역문 N문단.
- 빈 문단 보존: 원문의 빈 줄은 같은 위치에 빈 줄로 출력한다.
- 문단 병합 / 분할 금지.
- 줄바꿈 위치 동일.
- 1:1 원칙 — 어떠한 이유로도 깨지지 않는다.

## 출력 형식
- 번역된 본문만 출력. "번역:", "Here is the translation", 머리말, 후기, 주석 금지.
- 마크다운 헤더, 코드 블록 등 원문에 없는 형식 마크업 금지.
- 〈〉, 【】, 《》, ※, 〜, ──, …… 같은 기호는 위치·개수까지 보존.
- 반각/전각 공백, 말줄임표, 물결표, 느낌표 개수 등 시각적 뉘앙스를 정규화하지 않는다.

## 문체 및 시점
- 서술 시점(1인칭/3인칭) 일관 유지.
- 일본어 경어를 한국어 존댓말/반말에 자연스럽게 대응.
- 라이트노벨 / 웹소설 톤(짧은 문장, 속도감, 감정 직설)으로 옮긴다.

## 고유명사
- 글로서리 등록 표기 우선. 없으면 원문 그대로(카타카나/한자) 또는 음차.
- 스킬·마법·아이템 이름은 원문 유지. 첫 등장에만 같은 문단 안에서 짧은
  괄호 풀이 가능. 절대 줄바꿈하지 않는다.

## 호칭
- -さん/-くん/-ちゃん/先輩/先生 등은 인물 관계에 맞는 한국어로.
  에피소드 내 일관성을 유지한다.

## 대화·인용 부호
- 원문이 사용한 「」 / 『』 / "" / () 를 그대로 유지. 임의로 바꾸지 않는다.

## 의성어·의태어
- ドキドキ → 두근두근 / ワクワク → 두근두근·설렘 / キラキラ → 반짝반짝.
- 한국어에 자연스러운 대응이 없으면 의미를 풀어 한 단어로.

## 절대 금지
- 원문에 없는 내용 추가, 의미 임의 확장·축소.
- 번역자 주석, 해설, "TL note", "역주" 등 메타 정보.
- 문단 구조를 바꾸는 모든 변경 — 위 "문단 구조" 규칙이 이 모든 항목에 우선한다.
````

The full version (with concrete examples per section) lives in
`src/modules/translation/domain/default-prompt.ts` and is exposed at
`GET /api/translation-settings` as `defaultGlobalPrompt`.

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start the dev server (Turbopack) |
| `pnpm worker` | Start the background job worker |
| `pnpm build` | Production build |
| `pnpm start` | Start the production server |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run TypeScript checks |
| `pnpm check` | Run lint + typecheck |
| `pnpm test` | Run Vitest |
| `pnpm test:watch` | Run Vitest in watch mode |
| `pnpm dev:verify` | Run `check`, `test`, and `build` together |
| `pnpm dev:smoke` | Hit core HTTP smoke endpoints against a running app |
| `pnpm test:browser` | Run Playwright browser smoke tests |
| `pnpm dev:loop` | Run the full local verification loop |
| `pnpm canary` | Live-fetch drift detection across all four sources |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:studio` | Open Drizzle Studio |

## Project Structure

```text
src/
  app/              Next.js App Router pages and API routes
  components/       Shared React components
  lib/              Shared infra (db, i18n, auth, rate-limit, cache, redis, env)
  modules/          Domain modules (modular monolith)
    source/         Four source adapters (syosetu / nocturne / kakuyomu / alphapolis)
    catalog/        Novel + episode + ranking + adult filter
    library/        Subscriptions, progress, continue-reading
    translation/    Pipeline, sessions, glossary (bootstrap / promote / refresh / extract)
    reader/         Reader payload assembly (incl. ±10 TOC window)
    identity/       Profiles, sessions, user-scoped settings
    jobs/           Redis queue + worker runtime + recovery
    events/         Redis pub/sub for episode events
    export/         Streaming JSZip EPUB builder
    admin/          Ops visibility
tests/              Vitest + Playwright
drizzle/            27 SQL migrations
docs/               Architecture, design (incl. layout-v2 hi-fi spec), planning
scripts/canary-source-fetch.ts   Live-fetch canary for HTML-scraping sources
```

## API Overview

| Area | Endpoints |
|------|-----------|
| **Discovery** | `POST /api/novels/register`, `GET /api/ranking?scope=sfw|all|<site>&period=…`, `POST /api/ranking/translate-titles` |
| **Novel & Episodes** | `GET /api/novels/[id]`, `.../episodes`, `POST .../ingest`, `.../ingest-all`, `.../reingest-all`, `GET .../live-status`, `GET .../export?format=epub`, `POST .../episode-titles`, `POST .../cancel` |
| **Translation** | `POST .../bulk-translate`, `.../bulk-translate-all`, `.../bulk-retranslate`, `.../translate-session/abort`, `DELETE .../translations/discard` |
| **Per-episode** | `POST .../request`, `GET .../status`, `GET .../events` (SSE), `DELETE .../discard` |
| **Glossary** | `GET/PUT/POST .../glossary`, `.../entries`, `.../entries/[id]`, `.../entries/import`, `.../bootstrap`, `.../refresh` |
| **Library** | `GET /api/library`, `POST/DELETE .../subscribe`, `PUT /api/progress` |
| **Identity** | `POST /api/auth/sign-in`, `.../sign-out`, `GET .../session`, `GET .../csrf`, `GET/POST /api/profiles`, `GET/PUT/DELETE .../active` |
| **Reader & Settings** | `GET /api/reader/episodes/[id]`, `GET/PUT /api/settings` (incl. `adultContentEnabled`), `GET/PUT /api/translation-settings` (incl. `workloadOverrides`), `GET /api/openrouter/models`, `GET /api/stats` |
| **Translations Quality** | `GET /api/translations/quality/summary`, `GET .../quality/list` |
| **Admin** | `GET /api/health`, `.../jobs`, `.../metrics`, `GET/POST .../scheduled`, `GET .../translations`, `.../translations/quality`, `.../translations/trends` |
| **Jobs** | `GET /api/jobs/[id]`, `GET /api/novels/[id]/jobs/current` |

## Pages

| Page | Description |
|------|-------------|
| Home | Hero + continue reading |
| Library | Subscribed novels — KO+JA stacked titles, inline 동기화 / 이어 읽기 |
| Ranking | Multi-source grouped — period strip, source tabs with color swatches, R-18 pill |
| Register | Live URL detection across all four sources, preview card, format grid, recent list |
| Novel detail | Episode list with live updates, glossary editor (incl. Review tab for low-confidence entries), translation inventory, bulk actions, Stop button |
| Reader | TOC sidebar, JA / KO / KO·JA tri-toggle, .para-pair bilingual mode, glossary drawer, model switching, font settings |
| Settings | Sticky 200px rail (account / reading / translation / data) — theme cards, font-stack picker, stepper trio, per-workload model picker |
| Stats | Reading statistics |
| Profiles | Create, switch, migrate guest data |
| Sign-in | Lightweight identity entry point |

## Documentation

See [`docs/`](docs/) for architecture and planning details:

- [Progress](docs/progress.md) — current implementation status
- [Layout v2 hi-fi spec](docs/layout/layout-v2/) — Claude Design handoff bundle
  + outstanding TODO punch list
- [Multi-source design notes](docs/claude-design/) — adapter interface, registry,
  per-site adapters, API/cache, UI, gotchas
- [V1 Goal](docs/v1-goal.md), [V1 Architecture](docs/v1-architecture.md),
  [V1 Design](docs/v1-design.md), [V1 Design Style](docs/v1-design-style.md)
- [V2 Architecture](docs/v2-architecture.md) — multi-user, durable jobs, live
  updates
- [V3 Architecture](docs/v3-architecture.md) — glossary, context chaining,
  quality validation
- [V3 Review](docs/v3-review.md), [V4 Plan](docs/v4-plan.md),
  [V5 Plan](docs/v5-plan.md)
- [Dev Loop Harness](docs/dev-loop-harness.md) — local verification workflow
- [Security Audit](docs/security-audit-2026-04-15.md)

## License

[MIT](LICENSE)
