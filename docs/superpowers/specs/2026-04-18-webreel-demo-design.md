# Webreel Demo Reel — Shosetu Reader

**Date:** 2026-04-18
**Status:** Design approved, pending implementation plan
**Scope:** Produce a 60–90s highlight reel of Shosetu Reader using
[webreel](https://github.com/vercel-labs/webreel) against the local dev
environment. Captions are deferred to a follow-up; this spec covers the footage
only.

## Goal

Ship a single self-contained MP4 at `demo/output/shosetu-demo.mp4` suitable for
embedding in the project README. The recording must be produced by `webreel
record` (not OBS, ffmpeg screen capture, or any other tool) so that the
storyboard is version-controlled and reproducible.

## Non-goals

- Korean captions / subtitles (deferred; webreel has no native caption support,
  so this lands in a follow-up spec that adds an ffmpeg ASS burn-in step).
- Voice-over narration.
- Mobile/responsive framing (landscape 1920×1080 only).
- Production deployment recording — everything runs against local dev.
- Any changes to `src/` application code.

## User-visible inputs

- **Audience:** GitHub README viewers / portfolio reviewers.
- **Length target:** 60–90 seconds.
- **UI language during recording:** Korean (`ko` locale) throughout.
- **Viewport:** 1920×1080 landscape.
- **Output:** `.mp4`, H.264.

## Storyboard

Five scenes plus a brief outro card. Durations are approximate; final pacing is
tuned during recording.

| # | Scene                         | Duration | Interactions                                                                 |
|---|-------------------------------|----------|------------------------------------------------------------------------------|
| 1 | Register novel                | ~10s     | Navigate to `/register`, type ncode, submit, land on novel detail.           |
| 2 | Ingest + live translation     | ~22s     | Trigger bulk translate on seeded novel, watch SSE progress bar advance.      |
| 3 | Bilingual reader              | ~18s     | Open episode, toggle JA↔KR, adjust font size control.                        |
| 4 | Glossary + re-translate       | ~20s     | Open glossary editor, update an entry, re-translate one paragraph.           |
| 5 | Ranking discovery             | ~12s     | Visit `/ranking`, hover daily/weekly tabs, show translated titles.           |
| — | Outro                         | ~3s      | Navigate to `demo/outro.html` (static page) showing repo URL.                |

## Architecture

```
┌────────────────────┐   ┌────────────────────┐   ┌────────────────────┐
│  demo:seed         │ → │  dev app + worker  │ → │  webreel record    │
│  Drizzle fixtures  │   │  DEMO_MODE=1       │   │  scripted steps    │
│  into shosetu_demo │   │  localhost:3000    │   │  → output MP4      │
└────────────────────┘   └────────────────────┘   └────────────────────┘
```

All demo assets live under a new top-level `demo/` directory. `src/` is
untouched except for a narrowly-scoped `DEMO_MODE` guard in the worker that
swaps the real translation job for a deterministic stub (see "Worker stub"
below).

## Directory layout

```
demo/
  README.md                     Regeneration instructions
  webreel.config.json           Five-scene step script + outro
  seed/
    seed-demo.ts                Entry point: pnpm demo:seed
    fixtures/
      novel.json                One Syosetu-shaped novel
      episodes.ja.json          Five pre-ingested Japanese episodes
      episodes.ko.json          Four pre-translated, one left pending for scene 2
      glossary.json             8–10 glossary entries for scene 4
      ranking.json              Cached ranking payload for scene 5
    demo-worker.ts              Stub that drips translation progress events
  outro.html                    Static page webreel navigates to for scene 6
  scripts/
    render.sh                   One-shot pipeline (seed → dev up → record → teardown)
  output/
    shosetu-demo.mp4            Final artifact (gitignored)
```

New `package.json` scripts: `demo:seed`, `demo:record`, `demo:render`.

## Data seeding

- A dedicated database `shosetu_demo` (pointed at by `DATABASE_URL` override in
  `demo/.env.demo`) keeps demo state isolated from the developer's working DB.
- `seed-demo.ts` truncates demo tables, then inserts fixtures via Drizzle in a
  deterministic order so runs are byte-for-byte reproducible.
- One episode in `episodes.ko.json` is intentionally absent from the `ko`
  variants so scene 2 has a "Translate pending → in progress → complete"
  progression to record.
- Ranking data: `DEMO_MODE=1` causes the ranking module to read `ranking.json`
  from disk instead of calling Syosetu. This guards against network flakiness
  during recording.

## Worker stub

- `demo-worker.ts` replaces the real translation job handler when
  `DEMO_MODE=1`. It consumes the queued translation job for scene 2, then emits
  SSE progress events at 200ms intervals, completing in ~12 seconds.
- The stub writes the pre-baked translation from
  `fixtures/episodes.ko.json` upon completion, so the resulting DB state
  matches what a real translation would produce.
- Real OpenRouter calls are never made during recording; no credits spent, no
  network dependency, no nondeterminism.

## Recording pipeline

`demo/scripts/render.sh`:

1. Load `demo/.env.demo` (overrides `DATABASE_URL`, sets `DEMO_MODE=1`).
2. `pnpm db:migrate` against the demo DB.
3. `pnpm demo:seed` to load fixtures.
4. Start `pnpm dev` and the demo worker in the background.
5. `wait-on http://localhost:3000` until the app is reachable.
6. `npx webreel record --config demo/webreel.config.json`.
7. Tear down dev server and worker.

Failure at any step exits non-zero; partial artifacts stay in `demo/output/`
for inspection.

## webreel config shape

`webreel.config.json` declares a single video entry:

- `viewport`: `{ width: 1920, height: 1080 }`
- `url`: `http://localhost:3000/ko`
- `output`: `demo/output/shosetu-demo.mp4`
- `steps`: flat array combining all six scenes. Scene transitions use
  `navigate` or `click` rather than hard page reloads. `pause` steps absorb
  slack so timing stays predictable.

Selectors target stable `data-testid` attributes. Where any storyboarded
element lacks a testid today, the spec includes adding it as part of the
implementation (narrow, behavior-preserving edits to `src/`).

## Error handling

- `webreel validate` runs as a pre-commit hook on changes to
  `demo/webreel.config.json` to catch config drift.
- `render.sh` uses `set -euo pipefail` and traps to guarantee teardown of
  background processes even on failure.
- If `wait-on` times out (30s), the script reports which port/process is
  missing and exits.

## Testing

- Manual: run `pnpm demo:render`, open the resulting MP4, confirm each scene
  matches the storyboard and hits the 60–90s budget.
- Automated guard: a lightweight `pnpm demo:validate` runs `webreel validate`
  plus a JSON schema check on fixtures, wired into CI when `demo/` files
  change.

## Open questions (resolved)

- Captions — deferred to a follow-up spec.
- UI language — Korean throughout.
- Live vs mocked translation — mocked via `DEMO_MODE` worker stub.
- Viewport — 1920×1080 landscape.

## Follow-ups (out of scope here)

- Add Korean caption track via ffmpeg ASS burn-in.
- Export smaller `.webm` / `.gif` variants for inline README use.
- Add a CI job that records the demo on every release tag and uploads it as a
  release asset.
