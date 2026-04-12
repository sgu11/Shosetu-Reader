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
| 4 | Library and Progress | Partial |
| 5 | Translation Pipeline | Partial |
| 6 | Ranking Discovery | Done |
| 7 | Hardening and Docker | Partial |

---

## Acceptance Criteria (goal.md §7)

| Criterion | Status | Notes |
|-----------|--------|-------|
| Register novel via URL or ncode | Done | POST /api/novels/register |
| Read ingested Japanese episodes | Done | Reader with configurable fonts, prev/next nav |
| Subscriptions and continue-reading | Partial | Subscribe/unsubscribe works, but resume state restoration is incomplete |
| Korean translation request and read | Partial | Translation works, but durable queueing and KR fallback behavior still need work |
| UI supports English and Korean | Done | EN/KR dictionaries, locale switcher, cookie persistence |
| System runs with PostgreSQL and Redis, Docker-ready | Partial | PostgreSQL + Docker done, Redis deferred |

---

## What's Built

### API Routes (22 endpoints across 22 route files)
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

### Pages (7 screens + framework `_not-found`)
- Home (hero + continue reading with translated titles)
- Register novel
- Novel detail (episodes list, subscribe, unified actions menu)
- Reader (JA/KR toggle, progress tracker, prev/next nav, per-device font settings)
- Library (subscribed novels with progress)
- Ranking (daily/weekly/monthly/quarterly tabs with title translation)
- Settings (locale, theme, translation model picker, global prompt)

### Components (9 shared components)
- IngestButton — unified actions dropdown (ingest + translate)
- ReaderSettings — per-device cookie-based font/layout preferences
- SubscribeButton — subscribe/unsubscribe toggle
- TranslationToggle — JA/KR toggle with model selector and re-translate
- NovelPromptEditor — per-novel translation prompt editor
- ProgressTracker — automatic reading progress persistence
- LocaleProvider — i18n context provider
- LocaleSwitcher — EN/KR pill toggle
- Nav — top navigation bar

### Modules (8 domains)
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
- **Bulk operations**: "Ingest all" and "Translate all" currently run as fire-and-forget request-spawned tasks, not a durable queue
- **Rate limiting**: API endpoints rate-limited, with user-facing alert for translation rate limits
- **Title translation**: episode and ranking titles translated and cached in DB
- **Fonts**: 6 font families (Noto Serif JP, Nanum Myeongjo, Nanum Gothic, NanumBarunGothic, MaruBuri, Pretendard), 3 weights (Normal, Bold, Extra Bold)
- **i18n**: EN/KR dictionaries with cookie-based locale persistence, Korean as default

### Tests
- 41 tests across 6 files
- Coverage: ncode parsing, input schemas, episode scraping, Syosetu API, library schemas, translation schemas

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

### V2.1 Baseline Stabilization
- Keep `pnpm test`, `pnpm check`, and `pnpm build` green
- Remove documentation drift between code and progress tracking
- Add missing tests around translation status and reader state behavior

### V2.2 Multi-User Foundation
- Add lightweight profile creation and profile selection
- Replace the implicit default user flow with active-profile resolution
- Scope settings, subscriptions, progress, translation settings, prompts, and admin visibility per user
- Define migration behavior for existing anonymous/default-user data into a selected profile

### V2.3 Durable Async Work
- Replace request-scoped fire-and-forget work with a Redis-backed queue
- Record ingest and translation lifecycle in `job_runs`
- Make `/api/admin/jobs` reflect real queued/running/completed work

### V2.4 Reader Resume Loop
- Return saved progress in reader payload
- Persist and restore last-read language and scroll anchor
- Keep continue-reading aligned with actual reader state

### V2.5 Library and Novel Status Overview
- Add per-novel episode counters: total, pending, fetched, failed
- Add translation counters: untranslated, queued, processing, available, failed
- Add per-model translation counts for each novel
- Surface summary status on library cards and richer detail on the novel page

### V2.6 Translation Inventory and Control
- Add APIs and UI for discarding translations by episode, novel, model, and status
- Support safe re-translation after prompt/model changes without losing audit history unnecessarily
- Preserve the last readable KR translation while a new version is queued or processing
- Add coverage for discard, retry, and translation fallback rules

### V2.7 Model Visibility and Quick Switching
- Show the currently selected translation model in the reader top bar
- Add a low-friction quick-switch control for changing the active/requested model
- Distinguish between configured default model and currently displayed translation model

### V2.8 Cost Estimation and Observability
- Pull OpenRouter pricing metadata and cache it locally
- Estimate input/output token cost per translation job
- Persist per-translation estimated cost and aggregate cost per episode and novel
- Surface cost summaries on episode rows, novel overview, and admin/ops views

### V2.9 Live Updates and Progress Estimation
- Push or poll job/translation state changes so pages update without reload
- Refresh library and novel status cards in near real time
- Add translation progress bars using average throughput and request size history
- Show ETA/confidence as an estimate, not a guarantee

### V2.10 Follow-on Work
1. **Scheduled jobs** — Periodic ranking sync, metadata refresh
2. **Metrics** — Queue depth monitoring, source failure reporting, translation performance trends
3. **Light theme** — Currently dark-mode only

## Recommended Execution Order
1. **V2.2 Multi-User Foundation** — this unlocks truly personalized settings, prompts, and continue-reading
2. **V2.3 Durable Async Work** — needed before live updates and trustworthy progress tracking
3. **V2.4 Reader Resume Loop** — completes the user-level reading loop once active-profile selection exists
4. **V2.5 Library and Novel Status Overview** — use queued job data and translation inventory to populate counts
5. **V2.6 Translation Inventory and Control** — add discard/re-translate flows once inventory is visible
6. **V2.7 Model Visibility and Quick Switching** — improve reader ergonomics after model ownership is clear
7. **V2.8 Cost Estimation and Observability** — attach pricing and cost rollups to the stabilized translation pipeline
8. **V2.9 Live Updates and Progress Estimation** — rely on queued jobs and tracked throughput data for responsive UX

## First Slice Recommendation
- Start with **V2.2 Multi-User Foundation**
- Deliverables:
  - profile creation and selection strategy
  - active-profile resolver replacing default-user reads
  - user-scoped settings/library/progress queries
  - migration path for existing local data
- Reason:
  - It is the foundation for feature 1 directly
  - It prevents us from building status, costs, and live updates around a temporary single-user abstraction
