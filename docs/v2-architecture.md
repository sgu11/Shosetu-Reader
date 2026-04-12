# V2 Architecture Plan

Last updated: 2026-04-11

## Purpose

This document turns the V2 scope into an implementation-ready technical plan.
It focuses on the decisions we need before feature work starts, the seams we
need in code, and the order that reduces rework.

## Technical Review

### Current strengths
- Clear modular split between source, catalog, library, translation, and reader
- Good API surface for the current product loop
- Reader, ranking, registration, and translation all work end-to-end
- Profile-based multi-user scoping is in place across settings, progress, and library state
- Translation inventory, cost rollups, and model visibility are implemented
- Poll-based live refresh exists for the main long-running product flows
- Build, typecheck, lint, and tests are green

### Current constraints
- Background work is still executed by an inline in-process queue, so it is not durable across process restarts
- Translation generation for single-episode requests still runs inline after row creation
- `job_runs` is product-visible now, but it still reflects inline execution rather than a true worker runtime
- Live refresh is polling-based and page-level; it is not yet translation-run-aware at the episode level
- Scheduled work and metrics aggregation do not yet exist as first-class runtime features

## V2 Architectural Decisions

### 1. Identity Strategy
- Introduce a request-scoped `UserContext` abstraction now
- Use an active-profile model rather than user authentication
- Persist the selected profile id in a simple cookie or local profile selector state
- Keep the current default-user flow as the fallback implementation until profile selection fully lands
- Migrate all user-aware reads and writes to resolve user identity through the identity module
- If authentication is ever needed later, swap the resolver implementation rather than rewriting downstream modules

### 2. Async Work Strategy
- Introduce a `JobQueue` port now
- Keep an inline queue adapter temporarily for compatibility
- Replace the inline adapter with a Redis-backed durable queue in the implementation phase
- Treat `job_runs` as the canonical persisted state for live status and admin views

### 3. Live Update Strategy
- Start with polling as the baseline transport for product screens
- Add a job/translation status endpoint shape that works with polling first
- Consider SSE later only if polling becomes too expensive or too stale
- Keep UI update logic transport-agnostic so the delivery mechanism can change without rewriting components

### 4. Translation Inventory Strategy
- Treat each translation row as an artifact version with model, prompt version, checksum, and later cost metadata
- Never let an in-progress re-translation remove access to the last good readable translation
- Add discard operations as explicit inventory actions instead of overloading retry logic

### 5. Cost and Progress Strategy
- Capture pricing and throughput at the translation artifact level
- Aggregate cost and progress to episode and novel summaries instead of recalculating everything in-page
- Keep progress estimates explicitly best-effort and derived from historical translation runs

## Module Responsibilities

### `identity`
- Resolve request-scoped user context
- Own profile creation, listing, selection, and active-profile resolution
- Provide the user id used by library, reader, translation settings, and prompts

### `jobs`
- Own enqueue contracts and job dispatch
- Later own durable workers, job progress snapshots, and live status integration

### `translation`
- Own artifact identity, prompt/model selection, discard/retry rules, cost metadata, and throughput metrics

### `library`
- Own user-scoped reading state, continue-reading, and per-novel summary data

### `reader`
- Own the assembled payload for reading, including active readable translation and progress restore data

## Implementation Strategy

### Phase A: Foundations
1. Route all user-scoped code through `identity`
2. Route all background dispatch through `jobs`
3. Keep existing behavior working while these seams are introduced

### Phase B: Multi-user and Durable Jobs
1. Implement profile creation and active-profile resolution
2. Add durable queue + worker runtime
3. Persist job lifecycle to `job_runs`

### Phase C: Product Features
1. Reader resume restoration
2. Status counters on library and novel screens
3. Translation discard and re-translation controls
4. Current-model visibility and quick switching
5. Cost rollups and pricing visibility
6. Live updates and translation ETA/progress

## Deferred Goals Review

### Review Summary
- **Durable queue + worker** is still a required goal, not optional polish.
  The current inline queue is useful for local iteration but it is still tied to
  the app process and cannot satisfy the original reliability baseline in
  `goal.md`.
- **Live updates** are still valid, but the transport decision has changed.
  Polling now covers the core product loop well enough that SSE/WebSocket is no
  longer the immediate requirement.
- **Translation ETA/progress** is still worth building, but only after we
  capture enough measured run history to make estimates credible.
- **Scheduled jobs** and **metrics** are both still valid, but they should be
  treated as post-durable-queue phases because they depend on the same runtime
  and lifecycle model.
- **Light theme** remains valid UX work, but it is not on the critical path for
  V2 reliability or async-work completeness.

### Deferred Architecture Decisions

#### A. Durable Jobs
- Introduce a Redis-backed queue adapter behind the existing `JobQueue` port
- Add a dedicated worker entrypoint that registers handlers by `JobKind`
- Keep PostgreSQL `job_runs` as the canonical product-visible lifecycle record
- Add retry/backoff policy in the worker layer, not in route handlers
- Treat request handlers as enqueue-only boundaries

#### B. Live Update Transport
- Keep polling as the default product transport
- Add narrowly scoped summary endpoints where polling needs lighter payloads
- Do not adopt SSE/WebSocket until we see a concrete latency or server-load need
- Keep UI components transport-agnostic so polling can later be swapped out

#### C. Translation Progress and ETA
- Record translation run metadata per completed/failed attempt:
  - model
  - source size
  - token usage
  - duration
  - terminal status
- Derive throughput summaries from historical runs, grouped by model and coarse
  source-size bucket
- Expose ETA as:
  - estimated remaining time
  - confidence bucket (`low`, `medium`, `high`)
  - sample-size metadata
- Only show ETA for active translation work; queued work should remain “waiting”

#### D. Scheduled Jobs
- Reuse the same handler registry and queue transport as user-triggered work
- Add a scheduler layer that only enqueues jobs; it does not execute work itself
- Start with:
  - ranking sync
  - stale-novel metadata refresh

#### E. Metrics
- Start with PostgreSQL-backed operational aggregates and admin endpoints
- Measure:
  - job volume by kind/status
  - retry/failure rate
  - translation duration and throughput by model
  - source fetch failure rate
- Treat external dashboards/alerting as a future layer, not the first step

### Recommended Deferred Execution Order
1. Durable queue + worker
2. Translation timing history and ETA API
3. Scheduled jobs on the durable queue
4. Metrics/admin trend views
5. Light theme and broader visual refinements

## Definition Of Ready For Implementation

The repo is ready to move into V2 feature implementation when:
- user resolution no longer depends on direct imports of the default-user helper
- background jobs no longer depend on direct request-scoped fire-and-forget code
- V2 scope and execution order are documented in `PROGRESS.md`
- the architecture and decisions are documented in `docs/`
- baseline verification remains green after scaffolding changes
