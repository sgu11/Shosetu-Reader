# PROGRESS.md

Last updated: 2026-04-11

---

## Implementation Phase Status

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Foundation (Next.js, DB, env, logging) | Done |
| 1 | Data Model and Core Contracts | Done |
| 2 | Source Registration Foundation | Done |
| 3 | Episode Ingestion and Reader Baseline | Done |
| 3.5 | Design System Integration (dark-mode-native) | Done |
| 4 | Library and Progress | Done |
| 5 | Translation Pipeline | Done |
| 6 | Ranking Discovery | Done |
| 7 | Hardening and Docker | Partial |

---

## Acceptance Criteria (goal.md §7)

| Criterion | Status | Notes |
|-----------|--------|-------|
| Register novel via URL or ncode | Done | POST /api/novels/register |
| Read ingested Japanese episodes | Done | Reader with configurable fonts, prev/next nav |
| Subscriptions and continue-reading | Done | Subscribe/unsubscribe, resume reading with scroll/language/progress restoration |
| Korean translation request and read | Done | Translation pipeline with model selection, retry, discard, inventory. Inline queue (Redis upgrade planned) |
| UI supports English and Korean | Done | EN/KR dictionaries, locale switcher, cookie persistence |
| System runs with PostgreSQL and Redis, Docker-ready | Partial | PostgreSQL + Docker done, Redis deferred |

---

## What's Built

### API Routes (30 endpoints across 30 route files)
- `GET  /api/health`
- `POST /api/novels/register`
- `GET  /api/novels/[novelId]`
- `GET  /api/novels/[novelId]/episodes`
- `POST /api/novels/[novelId]/ingest`
- `POST /api/novels/[novelId]/ingest-all`
- `GET/PUT /api/novels/[novelId]/translation-prompt`
- `POST /api/novels/[novelId]/bulk-translate`
- `POST /api/novels/[novelId]/bulk-translate-all`
- `GET  /api/reader/episodes/[episodeId]`
- `POST/DELETE /api/library/[novelId]/subscribe`
- `GET  /api/library`
- `PUT  /api/progress`
- `POST /api/translations/episodes/[episodeId]/request`
- `GET  /api/translations/episodes/[episodeId]/status`
- `GET/PUT /api/translation-settings`
- `GET  /api/openrouter/models`
- `GET  /api/ranking`
- `POST /api/ranking/translate-titles`
- `GET/PUT /api/settings`
- `GET  /api/admin/jobs`
- `GET  /api/admin/translations`
- `POST /api/auth/sign-in`
- `POST /api/auth/sign-out`
- `GET  /api/auth/session`
- `GET/POST /api/profiles`
- `GET/PUT/DELETE /api/profiles/active`
- `GET  /api/jobs/[jobId]`
- `DELETE /api/novels/[novelId]/translations/discard`
- `DELETE /api/translations/episodes/[episodeId]/discard`

### Pages (9 screens + framework `_not-found`)
- Home (hero + continue reading with translated titles)
- Register novel
- Novel detail (episodes list, subscribe, unified actions menu)
- Reader (JA/KR toggle, progress tracker, prev/next nav, per-device font settings)
- Library (subscribed novels with progress)
- Ranking (daily/weekly/monthly/quarterly tabs with title translation)
- Settings (locale, theme, translation model picker, global prompt)
- Profiles (create, switch, guest revert)
- Sign-in (redirects to profiles)

### Components (12 shared components)
- IngestButton — unified actions dropdown (ingest + translate)
- ReaderSettings — per-device cookie-based font/layout preferences
- SubscribeButton — subscribe/unsubscribe toggle
- TranslationToggle — JA/KR toggle with model selector and re-translate
- NovelPromptEditor — per-novel translation prompt editor
- ProgressTracker — automatic reading progress persistence
- LocaleProvider — i18n context provider
- LocaleSwitcher — EN/KR pill toggle
- Nav — top navigation bar
- ProfileSwitcher — active profile display and management link
- AuthStatus — session authentication status
- NovelTranslationInventory — per-novel translation breakdown and discard controls

### Modules (9 domains)
- source — Syosetu API/HTML integration
- catalog — novel and episode domain
- library — subscriptions, progress, continue-reading
- translation — translation pipeline with OpenRouter
- reader — reader content assembly
- identity — default user and preference scaffolding
- jobs — schema and placeholders for background job orchestration
- admin — ops visibility endpoints for jobs and translations

### Key Implementation Details
- **Reader font settings**: stored in per-device cookie (`reader-prefs`, 1-year expiry), not in database — allows different settings per device
- **Translation model**: configurable via Settings page with OpenRouter model picker
- **Per-novel prompts**: custom translation instructions per novel (character names, tone)
- **Bulk operations**: "Ingest all" and "Translate all" run via inline job queue with DB-persisted progress (Redis upgrade planned)
- **Multi-user**: Profile-based user scoping with guest data migration; session auth scaffolded
- **Reader resume**: Scroll anchor + percent-based restoration with language persistence
- **Rate limiting**: API endpoints rate-limited, with user-facing alert for translation rate limits
- **Title translation**: episode and ranking titles translated and cached in DB
- **Fonts**: 6 font families (Noto Serif JP, Nanum Myeongjo, Nanum Gothic, NanumBarunGothic, MaruBuri, Pretendard), 3 weights (Normal, Bold, Extra Bold)
- **i18n**: EN/KR dictionaries with cookie-based locale persistence, Korean as default

### Tests
- 56 tests across 11 files
- Coverage: ncode parsing, input schemas, episode scraping, Syosetu API, library schemas, translation schemas, identity schemas, catalog schemas, reader schemas, translation discard schemas

---

## V2 Implementation Plan

### V2 Scope Additions
- **Multi-user support**: personalized settings, prompts, subscriptions, library state, and continue-reading per user
- **Status overview**: fetched/translated episode counts on library and novel detail, including per-model translation counts
- **Translation discard controls**: remove stale or low-quality translations to support clean re-translation
- **Top-bar model visibility**: show current model prominently and allow quick switching from the reader chrome
- **Cost estimation**: estimate OpenRouter translation cost per episode and aggregate it at the novel level
- **Live background updates**: fetching/translation progress should update in-page without manual refresh
- **Translation progress estimation**: progress bar based on average throughput and request size history

### V2.1 Baseline Stabilization — Done
- `pnpm test` (56 tests), `pnpm check`, and `pnpm build` all green
- Documentation updated to match code
- Tests cover identity schemas, translation discard schemas, catalog schemas, reader schemas

### V2.2 Multi-User Foundation — Done
- Profile creation and selection via `/profiles` page
- `resolveUserId()` replaces `ensureDefaultUser()` in all business logic
- Settings, subscriptions, progress, translation settings, prompts scoped per user
- Guest data migration with atomic transactions (preferences, subscriptions, progress)
- Session auth API scaffolded (`/api/auth/*`)

### V2.3 Durable Async Work — Done
- Redis-backed queue adapter added behind the shared `JobQueue` port
- Dedicated worker runtime (`scripts/worker.ts`) processes jobs outside request lifetimes
- `job_runs` tracks queue lifecycle, progress updates, retries, and recovery metadata
- Ingest-all, bulk-translate-all, and single-episode translation all use the queue path
- Docker Compose now includes `redis` and a separate `worker` service

### V2.4 Reader Resume Loop — Done
- Saved progress returned in reader payload (language, scroll anchor, progress percent)
- Scroll restoration with anchor-based lookup and percent fallback (8 retries)
- Language preference restored from progress
- Continue-reading on home page aligned with reader state

### V2.5 Library and Novel Status Overview — Done
- Per-novel episode counters: fetched/total with batch queries
- Translation counters: translated episodes count
- Per-model translation counts (grouped, sorted by count)
- Status badges on library cards and novel detail page

### V2.6 Translation Inventory and Control — Done
- Discard translations by episode (`DELETE /api/translations/episodes/[episodeId]/discard`)
- Discard translations by novel (`DELETE /api/novels/[novelId]/translations/discard`)
- Filter by model name or translation ID
- NovelTranslationInventory component with per-model breakdown
- In-reader per-translation discard via model dropdown
- Latest available translation preserved while new one processes

### V2.7 Model Visibility and Quick Switching — Done
- Current model shown in reader top bar pill button
- Model dropdown with available translations, switch, retranslate, discard
- Configured default model distinguished from currently displayed model
- Link to settings for model configuration

### V2.8 Cost Estimation and Observability — Done
- OpenRouter pricing cached in memory (1hr TTL) from models API
- Token usage (input/output) captured from OpenRouter response
- Per-translation estimated cost calculated and persisted in DB
- Cost aggregation at novel level (total + per-model) in status overview
- Costs displayed in: translation inventory, novel detail badges, library cards, reader model dropdown
- EN/KO i18n keys for all cost labels

### V2.9 Live Updates and Progress Estimation — Done
- Poll-based live refresh is now active on library and novel detail pages
- Novel detail shows in-page progress for active background jobs
- Processing translation status now returns ETA/progress estimates based on historical timing data
- ETA estimation improved: cross-model fallback when per-model samples insufficient, median-based calculation, variance-aware confidence scoring
- Per-episode translation progress bars in novel detail episode list
- Active translation count badges on library cards and novel detail status
- Admin translation trends endpoint (`/api/admin/translations/trends`) with per-model speed, percentiles, failure rates
- SSE deferred: polling covers the product loop adequately

### V2.10 Follow-on Work — Done
1. **Scheduled jobs** — metadata refresh job (`catalog.metadata-refresh`) with admin trigger endpoint (`/api/admin/scheduled`)
2. **Metrics** — unified admin metrics dashboard (`/api/admin/metrics`) with queue health, translation throughput (24h/7d/all), recent jobs, system overview
3. **Light theme** — full light mode with CSS custom properties, cookie-persisted `data-theme` toggle in nav and settings

## Deferred to Post-V2

### Valid but Not Blocking Ship
1. **SSE/WebSocket live updates** — polling covers the product loop; revisit if latency becomes a problem
2. **External observability** — Prometheus/Grafana can layer on the existing DB-backed metrics
3. **Ranking scheduled sync** — infrastructure exists (`/api/admin/scheduled`); add a ranking sync task when needed

## Completed V2 Phases
- V2.1 Baseline Stabilization ✅
- V2.2 Multi-User Foundation ✅
- V2.3 Durable Async Work ✅
- V2.4 Reader Resume Loop ✅
- V2.5 Library and Novel Status Overview ✅
- V2.6 Translation Inventory and Control ✅
- V2.7 Model Visibility and Quick Switching ✅
- V2.8 Cost Estimation and Observability ✅
- V2.9 Live Updates and Progress Estimation ✅
- V2.10 Follow-on Work ✅
