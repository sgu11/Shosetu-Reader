# Layout-v2 design refresh — outstanding TODO

Source deck: `docs/layout/layout-v2/narou-2/project/Narou Reader.html`
(+ `styles.css`, `screens.jsx`, `data.js`).

Last reviewed: 2026-04-28.

## Already shipped

| Phase | Commit | Coverage |
|---|---|---|
| 1 — Pills + cover + ranking row/hero | `4fd6c5c` | SourcePill tinted bg + glyph chip; NovelCover typographic block (no oklch); RankingRow KO+JA stack with tabular-sans rank; RankingHero N°1 numeral + stat strip |
| 2 — Bilingual reader | `85be001` | 3-state toggle JA / KO / KO·JA; `.para-pair` (KO sans 15.5pt over JA jp-serif 12.5pt + left-rule); reuses imperative DOM swap; no progress-schema widening |
| 3 — Masthead | `733e7bb` | 52px sans `narou / reader` wordmark; date/issue stamps; tagline strip; KO/EN nav doublets with hairline rule + active 2px underline |

## Outstanding by surface

Priority key: **P1** = visible regression vs deck, **P2** = polish, **P3** = nice-to-have.

### Ranking page (`/ranking`)

- **P1** Section header with last-fetched / status meta (`last fetched 2 min ago · 1.04s · 304 · adult on`). Currently sections only show count + status badge. Backend already returns `status` but not `lastFetchedAt` / latency / cache hit. Either surface from `getRankingSections` or render a static placeholder until data lands.
- **P1** R-18 pill on Nocturne hero + rows (deck: `<R18Pill />` next to source pill). `SourcePill` doesn't carry adult flag yet.
- **P2** Rank delta (`▲ 2` / `▼ 1` / `─`) under the rank numeral on each row. Requires storing previous rank or deriving from history.
- **P2** `.status-dot.serial` with pulse animation in row meta-line (deck: 6px dot, 2.4s pulse).
- **P2** Source-tab swatch dot per site color. Currently flat tab.
- **P3** Period strip distinct tokens for `quarterly | yearly | entire | hot` are wired in i18n but `getRankingSections` and adapters already gate which periods apply. Make sure the active label matches the scope (already auto-corrects, just tighten copy).

### Hero card on ranking

- **P2** Cover face: `cover-num` (32pt sans), `cover-title` KO+JA, `cover-foot` (mono ID + author). Currently `NovelCover` only renders glyph + ID/rank; design's hero cover is a denser typographic block.
- **P3** "Holding · 12 days at #1" mono eyebrow when rank is stable.

### Register page (`/register`)

- **P1** Live URL-detection card: animated "● 인식됨 → SourcePill · ID · parseInput · 14ms". Currently `parseInput` runs server-side on submit; deck shows it client-side as you type.
- **P1** Preview card after detection — mini-cover + KO title 18pt + JA below + summary (KO + JA secondary) + "__APOLLO_STATE__ 파싱 OK" mono footer.
- **P2** Format-card grid (4 sites) showing example URLs per source. Educational + purely static.
- **P2** Recent-registrations list with `when · pill · KO/JA title · ID · 읽기→`. Currently no recent list.
- **P3** Per-source detection priority hints when input is a bare ID (kakuyomu disambiguation).

### Library page (`/library`)

- **P2** Card structure: `pill · KO title 13pt sans · JA jp-serif 10.5pt · KO author 10.5pt`. Currently shows KO title + author; missing JA secondary on title.
- **P2** Per-card actions row: `↻ 동기화` ghost + `이어 읽기 →` accent. Currently the whole card is a `<Link>` — no inline actions.
- **P3** 4-column grid breakpoint match (deck: fixed 4-col on 1280; current is responsive).

### Reader page (`/reader/[episodeId]`) — **biggest gap**

- **P1** TOC left pane (220px). Per design, lists chapters as `n / KO title (sans 12.5pt) / JA jp-serif 10pt`, marks active with `.ent.on`. Currently no TOC sidebar; reader is `text + glossary drawer right`. Need:
  - chapter list query in reader payload (already partly available via `navigation`)
  - new `<ReaderTocSidebar>` component
  - grid restructure: `[220px_1fr_220px]` instead of `[1fr_300px]`
- **P1** Knobs right pane replacing/augmenting glossary drawer:
  - knob-rows: theme / size / line / width / ruby / ko·ja
  - mode is already in `ReaderSettings` — needs surface as compact mono `[label] [value]` rows per design
  - decision: replace glossary drawer or add as third toggleable pane via existing `data-glossary` attribute
- **P1** Crumb header — `Library / Syosetu` mono caps + KO novel title sans 14pt + JA jp-serif 11.5pt + chapter "9화 · 지표로부터의 문의". Currently single line "← title" + episode #.
- **P2** Progress rail in left pane (`9 / 201 · 4.5%` + 3px ink fill bar). Already have `MiniProgress`; reuse.
- **P2** Episode header inside `<article>`: pill + mono "제 9 화 · ep 09" + KO 32pt sans + JA jp-serif 15pt + meta strip (date · 4 600 字 / 9 분 · KO author · JA author).
- **P2** Footer block: `← 八話` ghost / `다음 갱신 매주 화요일 18:00` mono / `十話 →` primary. Currently `← 이전 / # / 다음 →`.
- **P3** EPUB URN footnote at bottom of right pane.

### Settings page (`/settings`)

- **P1** Sticky side rail (200px) with sections: 계정 · 프로필 / 읽기 환경 / 번역 / 데이터 · 동기화 / 소스 어댑터. Currently linear stacked sections, no sticky nav.
- **P2** Theme cards (4 cards): system / paper / sepia / night with mini preview swatch (gradient + pseudo lines). `theme-picker.tsx` exists but currently text-only.
- **P2** Reader stepper trio inline: `글자 −/15px/+` · `줄간격 −/1.95/+` · `너비 −/680 px/+`. Currently separate inputs in `ReaderSettings`.
- **P2** Font-stack picker grid (3 cards): Noto Serif JP / Noto Sans JP / Cormorant pair. Each shows live preview text. No equivalent today.
- **P3** Translation engine button row: `Local · 細やか v3` / `DeepL Pro` / `사용자 키 추가 →`. Currently model picker is a dropdown.
- **P3** Adult toggle copy update: "익명 캐시는 항상 SFW로 분리됩니다 (Vary: Cookie)" mono explainer line.

### Page-head + section-header polish

- **P2** `.section-header` styling: H2 sans 18px + mono `.count` "TOP 7 · OK" + mono `.meta` "last fetched 2 min ago · 1.04s · 304". Currently section header is a flex row with pill + count.
- **P3** `.brand-bottom` floating "N" badge — already shipped (visible bottom-left); confirm consistent across all pages.

### Tweaks panel

- **P3 / out of scope** Accent picker (moss/ink/rose/amber) + density (compact/comfortable). The deck ships this as a designer-tool side panel — useful as a hidden `?tweak=1` affordance for design QA, not a user feature.

## Suggested phasing

1. **Phase 4 — Ranking depth** (P1/P2): R18 pill, section header meta, status pulse dot, rank delta, source-tab swatch.
2. **Phase 5 — Register paste flow** (P1): client-side detection + preview card + format grid + recent list.
3. **Phase 6 — Reader 3-pane** (P1): TOC sidebar, knob rail, crumb header refresh, episode header design. Heaviest restructure — includes RSC payload extension for chapter list.
4. **Phase 7 — Settings sticky rail + theme cards + stepper trio + font picker** (P2 mostly).
5. **Phase 8 — Library card detail + actions** (P2).
6. **Phase 9 — Polish + brand consistency** (P3): rank delta history, EPUB URN footnote, holding-streak eyebrow, tweaks panel for design QA.

## Cross-cutting notes

- **`SourcePill` adult prop** — Phase 4 needs to thread `isAdult` through ranking item, register preview, library card. Backend already filters; UI just needs the badge.
- **Section meta API** — `getRankingSections` would need to expose `lastFetchedAt`, `latencyMs`, `upstreamStatus` for the section-header meta. Either bolt on or render placeholder text.
- **Reader TOC payload** — `getReaderPayload` returns `navigation.{prev,next}` only. TOC sidebar needs full chapter list (id, episodeNumber, titleJa, titleKo). Fetch alongside payload or via a sibling `/api/reader/toc/[novelId]` endpoint.
- **Tokens that landed in Phase 1** (`--src-{site}{,-tint,-ink}`) carry forward to status-dot colors and section-header source pills.
- **Theme cards** in settings should reuse the `[data-theme]` attribute pattern already in `globals.css`.
