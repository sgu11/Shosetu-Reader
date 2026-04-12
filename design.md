# DESIGN.md

## 1. Purpose

This document defines the design rules for the Syosetu-based novel reading platform.

It is the governing design contract for:
- product UX
- interaction patterns
- information architecture
- visual system
- reader behavior
- multilingual UI behavior

This project does **not** currently target OPDS compatibility or external reader integrations. The product is a **native web reading experience**.

The design direction is based on the spirit of Ferrari's design-md approach:
- clarity over cleverness
- consistency over feature sprawl
- high signal-to-noise ratio
- opinionated defaults
- strong hierarchy
- minimal distractions
- interfaces that feel fast, calm, and inevitable

---

## 2. Product Design Goals

The product should feel like:
- a calm digital library
- a fast subscription-and-reading workflow
- a Kindle-like reader adapted for the web
- a trustworthy tool for discovering, saving, and reading translated novels

Users should be able to:
1. discover novels quickly
2. subscribe with minimal friction
3. resume reading immediately
4. switch between original and Korean translation naturally
5. manage their library without cognitive overhead

---

## 3. Core UX Principles

### 3.1 Reading First
Reading is the primary activity.
All screens should support the reading loop:
- discover
- subscribe
- open
- read
- continue

Anything that interrupts reading must justify itself.

### 3.2 One Primary Action per Screen
Every screen should have one dominant action.
Examples:
- ranking page → subscribe/open novel
- novel page → start reading / continue reading
- episode page → read / switch language / next chapter
- library page → resume reading

Avoid equal visual weight for competing actions.

### 3.3 Calm Information Density
The product should be information-rich but visually restrained.
Use whitespace, hierarchy, and predictable grouping.
Do not emulate noisy manga/novel aggregator sites.

### 3.4 Progressive Disclosure
Show what is needed now.
Reveal advanced controls only when useful.
Examples:
- keep translation metadata secondary
- hide debug/provider/model information behind details panels
- avoid exposing ingestion state in the primary UI except when relevant

### 3.5 Consistency Over Novelty
Patterns must repeat.
Buttons, cards, filters, labels, and reading controls should behave identically across the product.

### 3.6 Strong Defaults
The system should make good choices automatically:
- sensible typography defaults
- persistent reading preferences
- automatic resume behavior
- remembered language preference
- dark mode support

---

## 4. Experience Pillars

### 4.1 Library-Like Browsing
The product should feel like a personal bookshelf, not a search console.

### 4.2 Seamless Registration
Registering a novel must feel lightweight whether from:
- ranking list
- pasted URL
- novel code

### 4.3 Translation Without Friction
Translation is a reading enhancement, not a separate product mode.
Language switching should feel immediate and integrated.

### 4.4 Quiet Reader
The reader must feel stable, immersive, and uncluttered.
No unnecessary chrome while reading.

---

## 5. Primary User Flows

### 5.1 Discover from Ranking
1. user opens ranking page
2. sees clear cards/list rows with title, author, tags, status, ranking position
3. user subscribes directly from ranking list
4. subscribed novel appears in library
5. user opens novel page or starts reading

### 5.2 Register by URL / Code
1. user pastes Syosetu URL or code
2. system validates and resolves metadata
3. user sees confirmation preview
4. user subscribes
5. library is updated

### 5.3 Read and Resume
1. user opens library
2. prominent “continue reading” item appears first
3. user opens last episode position
4. reading resumes with saved preferences

### 5.4 Switch Language
1. user reads original Japanese by default or by preference
2. user toggles to Korean translation
3. if translation exists, swap immediately
4. if translation is pending, show clear async state without blocking original reading

---

## 6. Information Architecture

## 6.1 Top-Level Navigation
Top-level navigation should remain minimal.

Primary sections:
- Home
- Ranking
- Library
- Search/Register
- Settings

Optional later:
- History
- Updates

### 6.2 Home
Purpose:
- quick return point
- continue reading
- recent subscriptions
- recently updated followed novels

Home should prioritize continuity, not marketing.

### 6.3 Ranking
Purpose:
- discovery from Syosetu ranking sources
- fast subscribe actions

### 6.4 Library
Purpose:
- user-owned collection
- progress tracking
- continue reading
- filtering/sorting

### 6.5 Novel Detail
Purpose:
- understand novel before reading
- subscribe/unsubscribe
- see episode list
- jump to last read

### 6.6 Reader
Purpose:
- long-form reading
- navigation between episodes
- stable reading preferences

### 6.7 Settings
Purpose:
- language
- reader typography
- theme
- translation defaults

---

## 7. Screen Specifications

## 7.1 Home Screen
Must include:
- continue reading section at top
- recent subscriptions
- recent updates from subscribed novels
- quick register input

Should not include:
- noisy recommendation carousels
- too many content blocks
- redundant metrics

### Priority order
1. continue reading
2. updates from library
3. quick register
4. recent additions

---

## 7.2 Ranking Screen
Two valid presentation options:
- compact card grid
- dense list view

Default should prefer a **dense, readable list** over oversized cards.

Each item should show:
- ranking position
- title
- author
- status (ongoing/completed/hiatus if derivable)
- brief metadata
- subscribe button
- open details action

Actions:
- subscribe
- view details
- optionally open on source site

Do not overload each row with too many badges.

---

## 7.3 Register Screen
This page exists to reduce friction.

Input modes:
- paste full URL
- paste novel code

Behavior:
- immediate validation feedback
- resolved preview card
- one clear confirmation action

This screen should feel utilitarian and fast.

---

## 7.4 Library Screen
The library is the second most important screen after the reader.

Must support:
- continue reading at top
- sort by recent activity
- filter by status
- filter by subscription date
- show unread/new episode signal

Preferred view:
- list with strong metadata and progress
- optional cover/card mode later

Each library item should show:
- title
- author
- reading progress
- last opened
- new episodes available
- primary resume/open button

---

## 7.5 Novel Detail Screen
Must include:
- title
- author
- source code / source link
- synopsis
- metadata summary
- subscribe/unsubscribe action
- continue reading / start reading
- episode list

Episode list should support:
- read state
- translated availability indicator
- latest episode marker
- quick jump to first unread

Novel detail is a transition screen between discovery and reading.
It should not become a cluttered dashboard.

---

## 7.6 Reader Screen
This is the most important screen in the product.

### Reader goals
- minimize distraction
- maximize text legibility
- keep navigation close but unobtrusive
- persist state automatically

### Reader layout
Should contain:
- top bar or hidden header with novel/chapter context
- central reading column
- bottom or floating next/previous controls
- language toggle
- reader settings access

### Reader chrome behavior
- default chrome should be minimal
- optional auto-hide on scroll or focus later
- avoid permanent heavy sidebars on desktop

### Reader content presentation
- single-column reading layout
- generous line height
- constrained content width
- visually stable paragraph spacing
- no ad-like interruptions

### Reader controls
Required:
- previous episode
- next episode
- language toggle (JP/KR)
- font size controls
- theme toggle
- progress indicator

Optional later:
- width preset
- line-height preset
- keyboard shortcuts

### Reader fallback states
If Korean translation is not ready:
- preserve Japanese reading access
- show non-blocking translation status
- offer manual retry if appropriate

---

## 8. Visual Design System

## 8.1 Tone
The interface should feel:
- quiet
- precise
- modern
- literary
- trustworthy

Avoid looking:
- gamified
- overly decorative
- neon-heavy
- crowded
- analytics-first

### 8.2 Layout Philosophy
Use strong containment and rhythm.
Prefer:
- consistent gutters
- predictable max-widths
- stable vertical spacing
- aligned action areas

### 8.3 Grid
Recommended:
- 12-column grid on desktop
- 4-column or 6-column responsive behavior on tablet/mobile
- single-column reading column in reader

### 8.4 Spacing
Use a consistent spacing scale.
Suggested spacing tokens:
- 4
- 8
- 12
- 16
- 24
- 32
- 48
- 64

Do not invent arbitrary spacing values casually.

### 8.5 Corners and Shape
Use restrained rounding.
Suggested default radius:
- small surfaces: 8px
- cards/modals: 12–16px

Avoid excessive pillification everywhere.

### 8.6 Elevation
Prefer subtle layering.
Use shadows sparingly.
Most hierarchy should come from spacing, contrast, and border treatment.

---

## 9. Typography

Typography quality is critical because this is a reading product.

### 9.1 General Rules
- prioritize legibility over brand expression
- use a clean sans-serif for UI
- use a highly readable text face for long-form content if needed
- keep the system stable across EN/KR/JP rendering

### 9.2 Type Hierarchy
Use a compact, consistent scale.

Suggested hierarchy:
- Display: marketing/rare use only
- H1: page titles
- H2: section titles
- H3: local groups
- Body: default UI/body text
- Small: metadata
- Caption: auxiliary labels only

### 9.3 Reader Typography
Reader defaults should prioritize long-session comfort:
- medium font size
- generous line height
- moderate paragraph spacing
- constrained width

Reader text should never stretch edge-to-edge on large screens.

### 9.4 Multilingual Typography
UI must work gracefully across:
- English
- Korean
- Japanese (content/original source)

Rules:
- ensure font stacks support KR/JP glyphs cleanly
- avoid layout breakage from wider Korean strings
- test line wrapping carefully
- avoid hard-coded text widths

---

## 10. Color System

## 10.1 Philosophy
Use color intentionally.
Color should support:
- hierarchy
- action clarity
- status communication
- theme quality

Not decoration.

### 10.2 Themes
Must support:
- light theme
- dark theme

Dark mode is mandatory because reading products need low-light comfort.

### 10.3 Color Roles
Define semantic roles, not page-specific colors.

Required roles:
- background
- surface
- elevated surface
- primary text
- secondary text
- muted text
- border
- accent
- accent contrast
- success
- warning
- error
- info

### 10.4 State Colors
Use color sparingly for:
- translated available
- translation pending
- new episodes
- subscription success/failure

Never rely on color alone; pair with icon/label.

---

## 11. Components

## 11.1 Buttons
Button hierarchy:
- primary
- secondary
- tertiary/ghost
- destructive

Rules:
- one primary button per local action cluster
- destructive actions must be visually distinct
- small icon-only buttons need strong hover/focus states

## 11.2 Inputs
Inputs must feel stable and unambiguous.

Required behavior:
- clear labels
- inline validation
- preserved entered value on error
- keyboard-friendly submission

## 11.3 Cards / Rows
Use cards only when grouping materially improves scanning.
For ranking/library, dense rows may be better than cards.

## 11.4 Tabs
Use tabs for mode switching only when content is closely related.
Example:
- novel detail: overview / episodes

Avoid too many nested tabs.

## 11.5 Modals
Use modals sparingly.
Appropriate for:
- reader settings
- confirmation for unsubscribe/destructive actions

Do not use modals for long-form reading or heavy workflows.

## 11.6 Toasts / Feedback
Toasts should confirm lightweight actions:
- subscribed
- unsubscribed
- settings saved
- translation queued

Errors needing action should usually be inline, not only toast-based.

---

## 12. Language & i18n Design

## 12.1 Supported UI Languages
- English
- Korean

### 12.2 Default Strategy
Recommended:
- UI default = English unless user preference exists
- allow explicit switch to Korean
- persist preference per user

### 12.3 Content Language Model
Content and UI language are separate.

Examples:
- UI in Korean, content in Japanese
- UI in English, content in Korean translation

This separation must be reflected in the data model and settings.

### 12.4 Copy Style
UI copy should be:
- concise
- neutral
- direct
- low-drama

Avoid overly playful or marketing-heavy copy.

---

## 13. Reader Interaction Rules

## 13.1 Progress Persistence
Progress must save automatically:
- episode last opened
- scroll position or reading anchor if supported
- chosen language mode

### 13.2 Episode Navigation
Navigation should be obvious but quiet.

Must support:
- previous episode
- next episode
- back to episode list
- jump to first unread from novel detail

### 13.3 Language Toggle
Language switching should:
- preserve reading context
- avoid full disruptive reloads when possible
- clearly indicate current language mode

### 13.4 Translation State UX
Possible states:
- not requested
- queued
- processing
- available
- failed

Each state needs:
- readable label
- clear next action if relevant
- no ambiguity about whether original text remains readable

---

## 14. States and Feedback

Every important surface must define:
- empty state
- loading state
- success state
- error state

### 14.1 Empty States
Examples:
- empty library
- no search/register result
- no translated episodes yet

Empty states should provide action, not decoration.

### 14.2 Loading States
Prefer skeletons where layout matters.
Use spinners sparingly.
Reader loads should preserve layout stability.

### 14.3 Error States
Errors should be:
- explicit
- actionable
- brief

Bad:
- “Something went wrong”

Better:
- “Could not resolve this Syosetu URL. Check the URL or try the novel code.”

---

## 15. Accessibility

Accessibility is a product requirement, not polish.

Required:
- keyboard navigability
- visible focus states
- semantic landmarks
- adequate contrast
- screen-reader-friendly labels
- scalable text without layout collapse

Reader-specific:
- reader controls reachable by keyboard
- high readability in both light and dark themes

---

## 16. Responsive Behavior

## 16.1 Mobile
On mobile, prioritize:
- reading comfort
- quick subscribe
- fast library access

Avoid dense control clusters.
Use bottom-accessible patterns where helpful.

## 16.2 Tablet
Tablet should feel especially strong for reading.
This may be the best target reading form factor.

## 16.3 Desktop
Desktop should use extra space carefully.
Do not expand the reading column excessively.
Use whitespace to improve calmness, not to add clutter.

---

## 17. Performance as Design

Performance directly affects perceived quality.

Design implications:
- instant-feeling navigation where possible
- avoid heavy front-end state complexity for simple interactions
- preload likely next actions carefully
- preserve layout stability during translation or chapter loading

A slow reader is a design failure.

---

## 18. Anti-Goals

The product should **not** become:
- a generic content scraper dashboard
- an OPDS catalog server
- a noisy anime aggregator clone
- a model playground for translation settings
- a feature-heavy but low-coherence admin UI

Do not optimize for novelty at the cost of reading quality.

---

## 19. Decision Rules

When design tradeoffs appear, choose in this order:
1. reading comfort
2. clarity of primary action
3. consistency with existing patterns
4. implementation simplicity
5. visual sophistication

If a feature improves power but harms calmness, it should usually be postponed.

---

## 20. Definition of Design Done

A feature is not design-complete unless:
- the primary action is obvious
- empty/loading/error states exist
- mobile and desktop behavior are defined
- EN/KR strings are considered
- accessibility basics are covered
- the feature does not degrade the reading loop

---

## 21. Immediate Product Direction

The current product direction is:
- native web reader
- ranking-based discovery
- URL/code-based registration
- personal subscription library
- Japanese source reading
- Korean translation support
- English/Korean UI
- Docker-ready deployment later

Out of current scope:
- OPDS
- external readers
- EPUB export
- broad plugin ecosystem

---

END

