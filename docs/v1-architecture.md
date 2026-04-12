# V1 Architecture

## 1. Purpose

This document defines the technical architecture for the Syosetu-based web novel reading platform.

It translates the requirements from `v1-goal.md` and the product rules from `v1-design.md` into a concrete system design.

Current scope:
- native web application
- Syosetu-based ingestion
- ranking-based discovery
- URL/code-based registration
- personal library and reading progress
- Japanese source reading
- Korean translation via OpenAI-compatible API (OpenRouter target)
- English/Korean UI
- Docker deployment as final target

Out of current scope:
- OPDS
- external reader integrations
- EPUB export
- plugin architecture
- multi-tenant enterprise features

---

## 2. Architecture Principles

### 2.1 Modular Monolith First
The system should begin as a modular monolith, not microservices.

Reasoning:
- lower coordination cost
- simpler deployment
- easier local development
- fewer distributed failure modes
- faster iteration while product boundaries are still forming

The architecture must still enforce module boundaries clearly so that later extraction remains possible.

### 2.2 APIs Over Scraping Where Available
Use official Syosetu APIs for:
- ranking retrieval
- novel metadata retrieval

Use HTML retrieval/parsing only where necessary for chapter/episode text.

### 2.3 Async by Default for Expensive Work
The following workloads must be asynchronous:
- chapter ingestion refresh
- translation generation
- periodic ranking sync
- optional metadata refresh

User-facing reads should not block on long-running work.

### 2.4 Stable Content Identity
All source and translated content must have stable identifiers and versioning rules.
This is required for:
- caching
- invalidation
- translation re-runs
- progress continuity

### 2.5 Source of Truth Discipline
Separate source truth layers:
- Syosetu source metadata = truth for upstream novel info
- locally normalized metadata = truth for product behavior
- translated content = derived artifact
- reading progress = application-owned truth

### 2.6 Product-Oriented Data Model
The database should model user workflows directly:
- subscription
- progress
- episode availability
- translation state

Avoid over-abstracting around crawler internals at the expense of product needs.

---

## 3. System Context

The system is a web application with four major concerns:

1. ingestion of source data from Syosetu
2. persistence and normalization of novels/episodes
3. translation and derived content generation
4. user-facing reading, subscription, and progress tracking

External systems:
- Syosetu APIs
- Syosetu web pages
- OpenRouter (OpenAI-compatible API)
- PostgreSQL
- Redis

Internal runtime parts:
- web app
- API server
- background worker
- job queue

---

## 4. High-Level Topology

Recommended initial deployment topology:

- `frontend` (web UI)
- `backend` (HTTP API + server-side app logic)
- `worker` (background jobs)
- `postgres` (primary relational database)
- `redis` (queue + cache)

In development, `frontend` and `backend` may run together if the chosen framework supports this cleanly.

In production, the minimum deployable unit may still be one app image used by:
- web process
- worker process

This preserves modularity without prematurely splitting codebases.

---

## 5. Recommended Stack

This document is stack-leaning, not stack-dogmatic. The recommended default is:

### 5.1 Application Framework
Preferred:
- Next.js full-stack app

Why:
- strong web product fit
- excellent routing and server rendering
- good i18n support
- convenient API route/server action patterns
- strong developer velocity for product work

Alternative acceptable:
- React frontend + separate backend (FastAPI / NestJS)

Use alternative only if the team explicitly wants stricter API/runtime separation early.

### 5.2 Language
Preferred:
- TypeScript for frontend and backend application layers

Why:
- shared types
- lower cognitive switching cost
- strong product velocity

### 5.3 Database
- PostgreSQL

### 5.4 Cache / Queue Backend
- Redis

### 5.5 ORM / DB Access
Preferred:
- Prisma or Drizzle

Selection rule:
- choose the one the implementation team can keep disciplined and migration-safe

### 5.6 Job Queue
Examples:
- BullMQ
- simple Redis-backed queue abstraction

Need:
- retry policy
- dead-letter handling or failure surfacing
- delayed jobs / scheduled refresh

### 5.7 HTML Parsing
- Cheerio or equivalent robust HTML parser

### 5.8 Validation
- Zod or equivalent schema validation for inputs and provider payloads

### 5.9 Styling
- Tailwind CSS or equivalent design-token-friendly system

This matches the need for a consistent, disciplined UI system.

---

## 6. Logical Modules

The modular monolith should be split into clear internal modules.

## 6.1 Source Module
Responsibility:
- interactions with Syosetu APIs
- interactions with Syosetu HTML pages
- source parsing and normalization

Subdomains:
- ranking client
- metadata client
- episode fetcher
- parser adapters

Key rule:
This module should not know about UI concerns.

---

## 6.2 Catalog Module
Responsibility:
- novels
- episodes
- metadata normalization
- availability state
- source linkage

This is the product-facing content domain.

---

## 6.3 Library Module
Responsibility:
- user subscriptions
- user library listing
- reading progress
- continue-reading logic
- first unread / latest read resolution

---

## 6.4 Translation Module
Responsibility:
- translation requests
- translation provider abstraction
- translation state machine
- translation caching/versioning
- retry/failure handling

This module must be provider-agnostic at the domain level.

---

## 6.5 Reader Module
Responsibility:
- content assembly for reader
- language-mode selection
- fallback behavior
- next/previous episode navigation
- persisted reader preferences

---

## 6.6 Identity Module
Responsibility:
- user accounts
- sessions
- locale preference
- theme preference
- default reader settings

Keep it minimal initially.

---

## 6.7 Sync / Jobs Module
Responsibility:
- scheduled ranking refresh
- metadata refresh
- episode refresh
- translation job orchestration

---

## 6.8 Admin / Ops Module
Responsibility:
- job inspection
- ingestion failure visibility
- translation cost visibility
- system health overview

This can start internal-only and minimal.

---

## 7. Data Model

Below is the recommended core schema shape.

## 7.1 Users

### `users`
Fields:
- `id`
- `email` or auth subject
- `display_name` nullable
- `preferred_ui_locale` (`en`, `ko`)
- `preferred_reader_language` (`ja`, `ko`)
- `theme` (`light`, `dark`, `system`)
- `created_at`
- `updated_at`

---

## 7.2 Novels

### `novels`
Fields:
- `id`
- `source_site` (`syosetu`)
- `source_ncode` unique
- `source_url`
- `title_ja`
- `title_normalized`
- `author_name`
- `author_id` nullable if derivable
- `summary_ja`
- `is_completed` nullable
- `status_raw` nullable
- `total_episodes` nullable
- `ranking_snapshot_json` nullable
- `source_metadata_json`
- `last_source_sync_at`
- `created_at`
- `updated_at`

Notes:
- keep source metadata raw enough for future repair/debugging
- keep normalized fields for product use

---

## 7.3 Episodes

### `episodes`
Fields:
- `id`
- `novel_id`
- `source_episode_id` or stable derived key
- `episode_number`
- `title_ja`
- `published_at` nullable
- `updated_at_source` nullable
- `source_url`
- `raw_html_checksum`
- `raw_text_ja`
- `normalized_text_ja`
- `fetch_status`
- `last_fetched_at`
- `created_at`
- `updated_at`

Rules:
- `episode_number` must be stable for navigation
- preserve source raw text and normalized text separately if normalization is non-trivial

---

## 7.4 Subscriptions

### `subscriptions`
Fields:
- `id`
- `user_id`
- `novel_id`
- `subscribed_at`
- `is_active`
- `last_checked_at` nullable

Unique:
- (`user_id`, `novel_id`)

---

## 7.5 Reading Progress

### `reading_progress`
Fields:
- `id`
- `user_id`
- `novel_id`
- `current_episode_id`
- `current_language` (`ja`, `ko`)
- `scroll_anchor` nullable
- `progress_percent` nullable
- `last_read_at`
- `created_at`
- `updated_at`

Unique:
- (`user_id`, `novel_id`)

This table powers continue-reading and resume behavior.

---

## 7.6 Reader Preferences

### `reader_preferences`
Fields:
- `id`
- `user_id`
- `font_size`
- `line_height`
- `content_width`
- `theme_override` nullable
- `created_at`
- `updated_at`

Could be merged into `users` early if simpler.

---

## 7.7 Translations

### `translations`
Fields:
- `id`
- `episode_id`
- `target_language` (`ko`)
- `provider` (`openrouter` etc.)
- `model_name`
- `prompt_version`
- `source_checksum`
- `status` (`queued`, `processing`, `available`, `failed`)
- `translated_text`
- `error_code` nullable
- `error_message` nullable
- `created_at`
- `updated_at`
- `completed_at` nullable

Unique recommendation:
- (`episode_id`, `target_language`, `provider`, `model_name`, `prompt_version`, `source_checksum`)

This supports deterministic caching and safe regeneration.

---

## 7.8 Job Records (Optional but Useful)

### `job_runs`
Fields:
- `id`
- `job_type`
- `entity_type`
- `entity_id`
- `status`
- `attempt_count`
- `payload_json`
- `result_json`
- `started_at`
- `completed_at`
- `created_at`

Useful for debugging and operator visibility.

---

## 8. Source Integration Design

## 8.1 Syosetu Ranking Retrieval
Use official ranking API where possible.

Responsibilities:
- fetch ranking slices/categories as supported
- normalize list results into internal ranking item shape
- cache short-term snapshots

Ranking data should be treated as discovery input, not permanent truth.

---

## 8.2 Novel Metadata Retrieval
Use official novel API where possible.

Responsibilities:
- resolve `ncode`
- fetch title, summary, author, status, counts, and related metadata
- normalize for product use

When user registers by URL or code:
1. parse and normalize input
2. resolve `ncode`
3. fetch metadata
4. upsert novel
5. enqueue episode discovery/fetch as needed

---

## 8.3 Episode Retrieval
Episode/chapter body retrieval likely requires source HTML fetch/parsing.

Responsibilities:
- fetch chapter page
- parse title/body/navigation hints if needed
- normalize text for reader
- compute checksum for version tracking

Guardrails:
- rate limiting
- retries with backoff
- respect robots/crawl etiquette
- minimal redundant fetches

---

## 8.4 Parsing Strategy
Parsing must not be scattered across handlers.

Recommended pattern:
- source client fetches raw document
- parser adapter converts raw input into typed domain object
- normalizer converts parsed object into canonical storage shape

This makes source changes easier to repair.

---

## 9. Translation Architecture

## 9.1 Provider Abstraction
Define a provider interface that isolates the translation domain from vendor specifics.

Example conceptual contract:

```ts
interface TranslationProvider {
  translate(input: {
    sourceText: string;
    sourceLanguage: 'ja';
    targetLanguage: 'ko';
    model: string;
    promptVersion: string;
  }): Promise<{
    outputText: string;
    rawResponse?: unknown;
  }>;
}
```

The application domain should not care whether the backend target is OpenRouter or another OpenAI-compatible provider.

---

## 9.2 Translation Pipeline
Recommended flow:
1. episode becomes eligible for translation
2. system computes translation cache key
3. if existing successful translation exists, reuse it
4. otherwise enqueue translation job
5. worker calls provider
6. persist result or failure state
7. reader UI reflects availability

---

## 9.3 Translation State Machine
States:
- `queued`
- `processing`
- `available`
- `failed`

Rules:
- only one active in-flight job per translation key
- retries allowed on transient failure
- permanent failures should surface clearly for operator debugging

---

## 9.4 Prompt Versioning
Prompt strategy must be versioned.

Why:
- reproducibility
- controlled quality changes
- cache correctness

Translation identity must include:
- provider
- model
- prompt version
- source checksum

---

## 9.5 Cost and Safety Controls
Need:
- input size limits / chunking policy
- cost logging
- retry limits
- timeout handling
- optional manual retranslate path later

---

## 10. Reader Content Assembly

The reader should not assemble content ad hoc in the UI.
The backend should provide a stable reader payload.

Suggested reader response payload:
- novel info
- current episode info
- language mode
- source text availability
- translated text availability
- prev/next episode pointers
- progress state
- translation status if relevant

This reduces front-end branching complexity.

---

## 11. API Design

API design may be REST-first or app-router/server-action-oriented, but the domain contracts should remain explicit.

## 11.1 Public Product Endpoints
Recommended conceptual endpoints:

### Discovery
- `GET /api/rankings`
- `GET /api/rankings/:category`

### Registration
- `POST /api/novels/register`
  - accepts URL or code

### Novel / Episode
- `GET /api/novels/:novelId`
- `GET /api/novels/:novelId/episodes`
- `GET /api/episodes/:episodeId`
- `GET /api/reader/episodes/:episodeId`

### Library
- `GET /api/library`
- `POST /api/library/:novelId/subscribe`
- `DELETE /api/library/:novelId/subscribe`

### Progress
- `PUT /api/progress/:novelId`

### Translation
- `POST /api/translations/episodes/:episodeId/request`
- `GET /api/translations/episodes/:episodeId/status`

### Settings
- `GET /api/settings`
- `PUT /api/settings`

---

## 11.2 Response Design Rules
Responses should:
- return stable IDs
- avoid leaking parser-specific weirdness
- expose status enums instead of vague strings
- be designed around product screens

Do not over-normalize front-end payloads into many tiny requests if the screen needs a composed object.

---

## 12. Jobs and Scheduling

## 12.1 Job Types
Initial job types:
- `sync_ranking`
- `sync_novel_metadata`
- `fetch_episode`
- `fetch_missing_episodes`
- `translate_episode`
- `refresh_subscribed_novel`

---

## 12.2 Scheduling Strategy
Recommended scheduled work:
- periodic ranking refresh
- periodic refresh for subscribed novels
- translation backfill only when explicitly requested or strategically triggered

Do not translate the entire universe eagerly by default.
That is likely too expensive.

---

## 12.3 Retry Strategy
Each job type should define:
- max attempts
- retryable errors
- backoff policy
- final failure behavior

Example policy:
- network/provider transient errors → exponential backoff
- parsing errors → fewer retries, raise operator visibility
- validation errors → fail fast

---

## 13. Caching Strategy

## 13.1 What to Cache
Cache candidates:
- ranking responses (short TTL)
- novel metadata (medium TTL or explicit refresh)
- reader payload fragments if safe
- translation existence/status checks

### 13.2 What Not to Cache Blindly
Do not casually cache:
- mutable reading progress in ways that risk stale resume state
- long-lived stale source HTML without checksum awareness

### 13.3 Cache Invalidation
Invalidate or refresh when:
- source checksum changes
- novel metadata sync detects meaningful updates
- translation prompt/model version changes

---

## 14. Authentication and Authorization

Authentication can begin minimal.

Recommended starting point:
- email/social auth via standard auth library
- session-based or token-backed web auth

Authorization requirements are simple initially:
- users can read public discovery data
- user-specific library/progress/settings require auth
- admin/ops endpoints require restricted access

---

## 15. i18n Architecture

UI localization and content translation are separate concerns.

## 15.1 UI Localization
Need:
- translation dictionaries for `en` and `ko`
- server/client locale resolution
- locale persistence per user

### 15.2 Content Localization
Reader must distinguish:
- source content language (`ja`)
- translated content language (`ko`)

This distinction should be first-class in both UI state and APIs.

---

## 16. Observability

Observability is required from day one, even if lightweight.

## 16.1 Logging
Must log:
- source fetch errors
- parser failures
- translation provider failures
- job retries and exhaustion
- registration failures

Logs should include stable entity references:
- `ncode`
- `novel_id`
- `episode_id`
- job id if present

### 16.2 Metrics
Useful metrics:
- ranking sync duration
- episode fetch success rate
- translation success/failure rate
- translation latency
- translation token/cost estimate
- queue depth

### 16.3 Tracing
If feasible later:
- request to job correlation
- register-novel flow tracing
- translation request tracing

---

## 17. Error Handling Philosophy

Error handling must follow product priorities:
- original Japanese reading should remain usable whenever possible
- translation failures should degrade gracefully
- source sync failures should not corrupt existing readable data

Rules:
- fail closed on invalid writes
- fail soft on derived features when source content exists
- preserve last good content when refresh fails

---

## 18. Security Considerations

Need baseline protections:
- input validation for URL/code registration
- server-side request controls for upstream fetching
- output sanitization for rendered content
- secrets management for provider credentials
- rate limiting on user-triggered expensive actions

Important:
- never render upstream HTML directly without sanitization/normalization
- protect against SSRF-like misuse through URL registration flows by strictly validating allowed source domains

---

## 19. Deployment Architecture

## 19.1 Development
Development can start with:
- local app server
- local postgres or dockerized postgres
- local redis
- mock or real OpenRouter configuration

This is acceptable until core flows stabilize.

---

## 19.2 Docker Target
Final baseline deployment should be Docker-based.

Recommended artifacts:
- `Dockerfile` for app image
- `docker-compose.yml` for local/integration environments

Compose services:
- app
- worker
- postgres
- redis

Optional:
- reverse proxy

---

## 19.3 Production Considerations
Need:
- environment-based config
- persistent database volumes/backups
- health checks
- migration step in release flow
- worker scaling independent from web if needed

---

## 20. Suggested Directory Structure

Illustrative only:

```text
src/
  app/
  modules/
    source/
    catalog/
    library/
    translation/
    reader/
    identity/
    jobs/
    admin/
  lib/
    db/
    queue/
    cache/
    logger/
    i18n/
  components/
  features/
  styles/
```

Inside each module, prefer:
- `domain/` — entities, enums, value objects
- `application/` — use cases, service functions
- `infra/` — database queries, external API clients
- `api/` — request/response schemas and validation logic (NOT route handlers)

### Routing convention
API route handlers live in `src/app/api/` as required by Next.js App Router. These handlers should be thin: validate the request, call the appropriate module service, and return the response. Business logic and data access stay in the module layers.

Avoid a shapeless `utils` graveyard.

---

## 21. Milestone-Based Implementation Plan

## M1. Source Registration Foundation
Build:
- URL/code parsing
- novel metadata fetch/upsert
- novel detail page shell

Outcome:
- a novel can be registered reliably

---

## M2. Episode Ingestion and Reader Baseline
Build:
- episode fetch/parsing
- episode persistence
- reader payload endpoint
- basic reader UI

Outcome:
- user can read source Japanese chapters

---

## M3. Library and Progress
Build:
- subscriptions
- library listing
- continue reading
- last-read tracking

Outcome:
- product becomes personally useful

---

## M4. Translation Pipeline
Build:
- provider abstraction
- translation jobs
- cache/versioning
- Korean reader mode

Outcome:
- translated reading becomes available safely

---

## M5. Ranking Discovery
Build:
- ranking sync
- ranking screen
- subscribe from ranking

Outcome:
- discovery loop is complete

---

## M6. Hardening and Docker
Build:
- logging/metrics basics
- retry policies
- compose setup
- production config hardening

Outcome:
- stable deployable baseline

---

## 22. Explicit Tradeoffs

### 22.1 Why Not Microservices Now
Because the main risks are:
- changing source behavior
- evolving translation flow
- shaping the reading UX

Not service-to-service scaling.

### 22.2 Why Translate Per Episode Instead of Whole Novel Eagerly
Because:
- cost control
- better caching discipline
- user-demand alignment
- simpler failure handling

### 22.3 Why Persist Derived Translation Artifacts
Because translation is expensive and must be reproducible, reusable, and inspectable.

---

## 23. Architecture Anti-Goals

Do not build:
- fully generic crawler framework before product fit
- over-generalized source plugin system
- synchronous translation-in-request path for large content
- multiple databases for different modules without necessity
- a front-end that owns too much business logic about translation state

---

## 24. Definition of Architecture Done

The architecture is good enough when:
- novel registration is reliable
- episode ingestion is resilient
- reading works without translation dependency
- Korean translation is asynchronous and cacheable
- library/progress model supports continue-reading cleanly
- module boundaries are explicit in code
- local development is straightforward
- Docker deployment is reproducible

---

END

