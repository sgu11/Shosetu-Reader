# ADR 0002: Deferred Goals Prioritization

## Status
Accepted

## Context

After the main V2 slices landed, the remaining backlog mixed together
infrastructure requirements, product responsiveness work, observability, and
visual polish:
- Redis-backed durable jobs
- live updates
- translation ETA/progress
- scheduled jobs
- metrics
- light theme

Some of these are still required to satisfy the original technical baseline in
`v1-goal.md`, while others are valid but lower priority.

## Decision

We will treat the deferred backlog in two tiers.

### Tier 1: Required Next Phases
1. Durable queue + worker runtime
2. Translation timing history and ETA/progress
3. Scheduled jobs using the same durable queue
4. Metrics/admin summaries built on the resulting lifecycle data

### Tier 2: Valid But Not Critical-Path
1. SSE/WebSocket transport for live updates
2. Light theme

We also make the following architecture decisions:
- Redis is the queue transport, not the product state store
- PostgreSQL `job_runs` remains the source of truth for product-visible job
  status
- Polling remains the default live-update transport unless proven inadequate
- Translation ETA must be derived from recorded historical runs, not ad hoc
  client-side timers
- Scheduled jobs enqueue into the same handler registry as user-triggered jobs

## Consequences

### Positive
- The next implementation phases are ordered by dependency instead of by
  aspiration
- Reliability and observability work happen before optional transport or theme
  work
- We avoid building ETA/progress on top of unstable or non-durable execution
- Scheduled jobs and user-triggered jobs share one operational model

### Negative
- Light theme and richer realtime transport are intentionally delayed
- Some “live” UX will continue to rely on polling in the near term

## Follow-up

1. Add a Redis-backed `JobQueue` adapter and worker entrypoint
2. Add translation run history needed for ETA/confidence
3. Add scheduled enqueue sources for ranking sync and metadata refresh
4. Expand admin/metrics views from DB-backed aggregates
