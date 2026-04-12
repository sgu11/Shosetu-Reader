# V3 Post-Implementation Review

Last updated: 2026-04-12

## Executive Summary

V3 delivered the core architecture: structured glossary, auto-extraction,
session-based context chaining, episode chunking, and quality validation. All
code compiles, tests pass, and the system is live. However, the review surfaces
**14 actionable issues** across correctness, reliability, UX, and
design-vs-spec gaps. These fall into a natural V3.6 hardening pass.

---

## Issue Inventory

### A. Session Ordering & Reliability

| # | Issue | Severity | File |
|---|-------|----------|------|
| A1 | **`loadSessionGlobalPrompt()` uses wrong user** — fetches first row from `translation_settings`, not the session creator's settings | Critical | `translation-sessions.ts:296-304` |
| A2 | **Failed translation left in "processing" state** — `advanceSession` catches errors and skips to next episode, but never resets the translation row from "processing" back to "failed" | High | `translation-sessions.ts:255-274` |
| A3 | **No duplicate session prevention** — two concurrent bulk-translate requests for the same novel create overlapping sessions that fight over the same episode rows | High | `bulk-translate-all/route.ts` |
| A4 | **Session context only passed to first chunk** — when a long episode is chunked, only chunk 0 gets `contextSummary`; chunks 2+ lose the rolling story context | High | `request-translation.ts:325` |
| A5 | **Ordering is safe today but fragile** — single Redis worker processes jobs sequentially via `brPop`, so ordering holds. But nothing enforces this if a second worker is added or jobs are requeued during recovery | Medium | `job-runtime.ts` |

### B. Glossary Quality & Size

| # | Issue | Severity | File |
|---|-------|----------|------|
| B1 | **No glossary size cap** — 500+ confirmed entries renders a massive markdown table injected into every translation request; can blow system prompt budget | Critical | `render-glossary-prompt.ts` |
| B2 | **Extraction too aggressive** — extracts all novel terms including trivial ones; no selectivity for "essential, important" terms; dedup only checks confirmed entries, not suggested/rejected | High | `extract-glossary.ts:64-70` |
| B3 | **Extraction re-suggests rejected terms** — if a term was rejected, the extraction prompt doesn't know and will suggest it again next episode | High | `extract-glossary.ts` |
| B4 | **Version bumped too eagerly** — any import call bumps glossary version even if zero confirmed entries changed, invalidating session fingerprints unnecessarily | Medium | `glossary-entries.ts:198` |
| B5 | **Markdown injection in glossary table** — if a reading or notes field contains `|`, the rendered markdown table breaks | Medium | `render-glossary-prompt.ts` |
| B6 | **Extraction truncates at 4000 chars** — short for typical episodes (5K-10K chars); misses terms introduced later in the episode | Medium | `extract-glossary.ts:73-74` |

### C. Chunking & Translation Quality

| # | Issue | Severity | File |
|---|-------|----------|------|
| C1 | **Single-paragraph text not chunked** — if entire episode is one paragraph >12K chars (no `\n\n`), the algorithm silently returns it as one chunk, risking API limit errors | High | `chunk-episode.ts:37-55` |
| C2 | **Chunk boundary repetition** — previous chunk's last 500 chars injected as context, but no instruction telling model not to repeat it; no dedup on reassembly | High | `openrouter-provider.ts:70-80` |
| C3 | **Adaptive max_tokens underallocates for Korean** — formula assumes 3 chars/token but Korean averages ~2; long episodes may truncate | Medium | `openrouter-provider.ts:90-95` |
| C4 | **Chunked translation can't resume** — if chunk 3/5 fails, retry retranslates all 5 chunks from scratch; partial results are discarded | Medium | `request-translation.ts:313-340` |
| C5 | **Quality thresholds too loose** — JP→KR length ratio check allows 30%-250% but realistic range is 60%-180%; untranslated segment threshold 20 chars should be 10 | Medium | `quality-validation.ts` |
| C6 | **No truncation detection** — if model hits max_tokens and output ends mid-sentence, no warning is generated | Medium | `quality-validation.ts` |
| C7 | **Glossary compliance check missing** — V3 spec lists "check confirmed glossary entries appear in translation" but this was not implemented | Medium | `quality-validation.ts` |

### D. UI / UX

| # | Issue | Severity | File |
|---|-------|----------|------|
| D1 | **Glossary table overflows page** — entries table forces horizontal scroll on mobile; parent container is `max-w-3xl` but table exceeds it | High | `novel-glossary-editor.tsx:524` |
| D2 | **No pagination** — all entries rendered in one table; 100+ entries degrades performance | High | `novel-glossary-editor.tsx:552` |
| D3 | **Silent error handling** — all CRUD operations fail silently (catch blocks are empty); user has no feedback on failure | High | `novel-glossary-editor.tsx` (multiple) |
| D4 | **hasWarnings field is dead code** — added to reader payload but frontend never renders it | Low | `reader/api/schemas.ts:27` |
| D5 | **Missing i18n keys** — ~15 hardcoded strings with `// needs i18n` comments | Medium | `novel-glossary-editor.tsx` |
| D6 | **No filter tab counts** — category tabs don't show per-category entry counts | Low | `novel-glossary-editor.tsx:498-513` |

---

## V3 vs Spec Gap Analysis

| Spec Requirement | Status | Gap |
|-----------------|--------|-----|
| Structured glossary CRUD | **Done** | Import race condition (concurrent inserts) |
| Living glossary updates | **Done** | Over-extracts; re-suggests rejected terms |
| Glossary compliance quality check | **Not done** | Spec section 6 lists it; not implemented |
| Glossary size cap (500 entries) | **Not done** | Spec risk table mentions it; not enforced |
| Session processing in strict order | **Works** | Only because single worker; not enforced |
| Session failure policy (skip + warn) | **Partial** | Skips but orphans translation row in "processing" |
| Chunking fallback to single-newline | **Not done** | Spec says "fall back to single newline"; only splits on `\n\n` |
| Overlap context = last 2 paragraphs of source | **Different** | Spec says source overlap; impl uses last 500 chars of translated output |
| Session UI (progress bar, management) | **Not done** | No session progress or management UI |
| Quality warnings in novel detail view | **Not done** | Only admin endpoint exists |
| Cached-token telemetry | **Not done** | Token counts stored but no cache-hit tracking |
| `promptVersion` bump to "v3" for sessions | **Partial** | Sessions use "v3" but sessionless stayed at "v2" (correct per spec) |

---

## Recommended V3.6 Plan

Ordered by impact. Each item is a focused, testable slice.

### Phase 1: Correctness Fixes (must-do)

**1. Fix `loadSessionGlobalPrompt` multi-user bug (A1)**
- Accept `userId` parameter (or store it on the session row at creation time)
- Add `creator_user_id` column to `translation_sessions`; migration 0015

**2. Fix orphaned "processing" translations (A2)**
- In `advanceSession` catch block, update the translation row to `"failed"`
  before skipping to next episode
- Add `session_episodes_failed` counter on session for observability

**3. Prevent duplicate sessions (A3)**
- Before creating a session, check for an existing `active` session for
  the same novel; return it if found
- Or: add a unique partial index `(novel_id) WHERE status = 'active'`

**4. Pass context to all chunks (A4)**
- Include `contextSummary` in all chunk translate calls, not just chunk 0
- The system message is cached anyway; the context message is small

**5. Glossary size cap (B1)**
- Cap rendered glossary at 200 confirmed entries (not 500 — prompt budget)
- Order by category priority, then by creation date (older = more essential)
- Add truncation note: `"(+N entries omitted)"`
- Log when truncation happens

**6. Chunk fallback for no-paragraph text (C1)**
- When no `\n\n` boundary exists, fall back to splitting on single `\n`
- If no `\n` either, split at sentence boundaries (。/！/？)
- Last resort: split at TARGET_CHUNK_SIZE character boundary

### Phase 2: Glossary Precision (high-value)

**7. Smarter extraction — register only essential terms (B2 + B3)**
- Rewrite extraction prompt to be selective:
  - "Extract only proper nouns, recurring character names, unique terminology,
    and skill/magic names. Do NOT extract common words, adjectives, or
    one-time descriptions."
- Include rejected terms in the prompt context with label `(rejected — do not
  re-suggest)` so the model skips them
- Include suggested terms too: `(already suggested — skip unless translation
  changed)`
- Reduce max extraction to 10 terms per episode (currently unbounded)

**8. Conditional version bumping (B4)**
- Only bump `glossary_version` when confirmed entries actually change
- Track whether any imported entry has `status: "confirmed"`; skip bump
  for suggested-only imports

**9. Sanitize glossary table rendering (B5)**
- Escape `|` characters in reading/notes fields before rendering markdown

### Phase 3: Translation Quality (medium-value)

**10. Add chunk repetition prevention (C2)**
- Add explicit instruction to provider: `"Do NOT repeat the context text.
  Begin your translation immediately after where the previous chunk ended."`
- Post-reassembly: detect leading overlap between chunk N's output and
  chunk N-1's tail; strip if similarity > 80%

**11. Fix max_tokens formula (C3)**
- Change from `chars * 1.5 / 3` to `chars * 1.2 / 2` — better match for
  Korean tokenization
- Keep the `[2048, 16384]` clamp

**12. Add glossary compliance check (C7)**
- For each confirmed entry where `term_ja` appears in source text, check
  if `term_ko` appears in translated text
- Severity: "info" (advisory, not blocking)

**13. Add truncation detection (C6)**
- Warn if translated text ends mid-sentence (no sentence-ending punctuation
  in last 50 chars: 다/요/죠/./!/?)
- Severity: "warning"

**14. Tighten quality thresholds (C5)**
- Length ratio: warn at <0.5 or >2.0 (down from 0.3/2.5)
- Untranslated segments: 10+ consecutive CJK chars (down from 20)
- Paragraph mismatch: promote from "info" to "warning" at <0.7 or >1.5

### Phase 4: UI Hardening (user-facing)

**15. Fix glossary table overflow (D1)**
- On mobile: collapse to card layout instead of table
- Or: limit visible columns to JP / KO / Status / Actions on mobile

**16. Add pagination (D2)**
- Default 30 entries per page
- Show total count and page controls

**17. Add error feedback (D3)**
- Replace silent catches with toast notifications
- On failure, revert optimistic UI updates

**18. Complete i18n (D5)**
- Migrate all hardcoded strings to dictionary keys

**19. Show quality warnings in reader (D4)**
- Render a subtle "⚠ translation may have issues" bar when `hasWarnings`
  is true; link to details

### Phase 5: Observability & Robustness (defensive)

**20. Add session ordering guard (A5)**
- Store `expected_next_index` on session row
- In `advanceSession`, verify `payload.currentIndex === session.expectedNextIndex`
- If mismatch, log error and skip (don't corrupt context)

**21. Extraction cost control**
- Track extraction cost separately from translation cost
- Skip extraction if novel already has >100 suggested entries pending review
  (user isn't curating; don't waste API calls)

**22. Session progress UI**
- Show active sessions on novel detail page with progress bar
- Allow cancelling a running session

---

## Priority Matrix

| Phase | Items | Effort | Impact |
|-------|-------|--------|--------|
| 1. Correctness | A1-A4, B1, C1 | ~2h | Fixes bugs that cause wrong output |
| 2. Glossary Precision | B2-B5 | ~1.5h | Makes glossary actually useful |
| 3. Translation Quality | C2-C7 | ~1.5h | Improves output quality |
| 4. UI Hardening | D1-D5 | ~2h | Makes glossary UI usable |
| 5. Observability | A5, extras | ~1h | Defensive, future-proofing |

Total estimate: ~8h of focused work, naturally split across 5 deployable slices.

---

## Decision Points for User

1. **Glossary size cap**: 200 entries recommended. Want a different limit?
2. **Extraction selectivity**: Cap at 10 terms/episode? Or 5?
3. **Session ordering**: Add explicit guard now, or defer until multi-worker?
4. **Mobile glossary layout**: Card view or truncated table?
5. **Quality thresholds**: Tighter defaults proposed above — review and adjust?
