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
- Build, typecheck, lint, and tests are green

### Current constraints
- User identity is still implemented as a single default user fallback
- Background work is request-scoped fire-and-forget, not durable
- `job_runs` exists as schema but is not yet the source of truth for work status
- Reader resume state is only partially implemented
- Translation inventory is modeled in the database, but operational controls are missing
- UI refresh still depends on manual reloads after long-running work

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

## Definition Of Ready For Implementation

The repo is ready to move into V2 feature implementation when:
- user resolution no longer depends on direct imports of the default-user helper
- background jobs no longer depend on direct request-scoped fire-and-forget code
- V2 scope and execution order are documented in `PROGRESS.md`
- the architecture and decisions are documented in `docs/`
- baseline verification remains green after scaffolding changes
