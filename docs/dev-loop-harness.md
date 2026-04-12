# Dev Loop Harness

Last updated: 2026-04-11

## Current Local Baseline

- Node: `v25.9.0`
- pnpm: `10.33.0`
- `.env`: present
- PostgreSQL CLI: available via `psql`
- Docker: not installed in this environment
- Browser automation runtime: not installed yet
- Repo health at prep time:
  - `pnpm check` ✅
  - `pnpm test` ✅
  - `pnpm build` ✅

## Harness Commands

- Start app: `pnpm dev`
- Static + test + production verification: `pnpm dev:verify`
- Runtime smoke checks against a running local server: `pnpm dev:smoke`
- Browser smoke checks with managed local server: `pnpm test:browser`
- Full local iteration loop: `pnpm dev:loop`

`pnpm dev:smoke` checks:
- `GET /api/health`
- `GET /api/profiles/active`
- `GET /api/library`
- `GET /api/jobs/:missing-id` returns `404`

`pnpm test:browser` checks:
- home navigation renders
- library page renders
- profiles page renders and create control is visible

If the app is not running on `http://localhost:3000`, set `APP_URL`:

```bash
APP_URL=http://localhost:3001 pnpm dev:smoke
```

## Browser Tooling

Playwright is installed and Chromium is available locally.

Current browser coverage is intentionally small and safe:
- home
- library
- profiles

Recommended next browser expansions:
- profile switching updates top-bar badge
- job progress reconnect after reload
- reader preserves KR while retranslate runs

## V2 Fix Loop Plan

This plan is derived from the current V2 review and is ordered for maximum product impact.

### Track 1: Security and Data Exposure

1. Scope `/api/jobs/[jobId]` to the active profile or a safe public summary.
2. Remove raw payload exposure from public job responses.
3. Add ownership checks for novel/job operations where profile data is involved.

Acceptance:
- A job ID from one profile cannot expose another profile’s job metadata.
- Public job responses contain only user-safe fields.

### Track 2: Reader Translation Continuity

1. Keep the currently displayed available KR translation mounted while a retranslation is queued/processing.
2. Separate `displayedTranslation` from `pendingTranslation` in the client state.
3. Add regression coverage for “retranslate while readable KR exists”.

Acceptance:
- Starting a retranslation never forces the reader back to JA if a readable KR translation already exists.

### Track 3: Profile UX Reliability

1. Make profile create/select/guest-switch optimistic and self-refreshing.
2. Add visible error states and success feedback to `/profiles` and the top-bar profile switcher.
3. Ensure active profile state updates immediately after changes without requiring a full reload.

Acceptance:
- The active profile badge updates immediately after profile changes.
- Failures are visible and actionable instead of silent.

### Track 4: Background Job UX and Reconnection

1. Persist last active job IDs per novel page or rediscover them from server state.
2. Reconnect polling after refresh/navigation.
3. Show clearer running/completed/failed status in novel detail without relying on transient button text.

Acceptance:
- Refreshing the novel page during an active job preserves progress visibility.

### Track 5: Localization and Status Language

1. Replace raw status strings (`queued`, `failed`, `fetched`) with localized labels.
2. Standardize status wording across library, novel detail, reader, and job progress.

Acceptance:
- Korean UI contains no raw English workflow labels outside model IDs.

### Track 6: Mobile and Density Pass

1. Make the top nav responsive.
2. Reduce badge density on library and novel detail cards.
3. Improve hierarchy for model/cost/status chips on narrow screens.

Acceptance:
- Key screens remain readable and navigable on mobile widths.

### Track 7: Error Handling and Feedback

1. Replace silent catches in profile and reader-related UI with visible feedback.
2. Add retry affordances where actions fail.

Acceptance:
- User-triggered actions always end in visible success, failure, or in-progress feedback.

## Recommended Loop Cadence

For each slice:

1. Implement one track item.
2. Run `pnpm check`
3. Run `pnpm test`
4. Run `pnpm build`
5. Run `pnpm test:browser`
6. Optionally run `pnpm dev:smoke` against an already running server for targeted API debugging.

## Suggested First Iteration

Start with:
1. Track 1: secure `/api/jobs/[jobId]`
2. Track 2: fix KR continuity during retranslate
3. Track 3: fix stale profile switcher state

That gives the best mix of correctness, trust, and visible UX improvement.
