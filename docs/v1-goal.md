# V1 Goal

## 1. Product Goal

Build a native web reading platform for Japanese web novels from Syosetu that lets users:
- discover novels from rankings
- register novels by URL or `ncode`
- subscribe and manage a personal library
- read original Japanese episodes comfortably
- switch to Korean translation when available
- resume reading with saved progress and preferences

The product target is a calm, Kindle-like web reader with a disciplined backend. Current scope is the native web experience only.

---

## 2. Product Principles

### 2.1 Reading First
The reading loop is the product:
- discover
- subscribe
- open
- read
- continue

### 2.2 Stable and Deterministic
- Prefer Syosetu APIs over scraping when possible
- Treat episode translation as a versioned, cacheable artifact
- Keep ingestion and parsing reproducible

### 2.3 Modular Monolith
Start with one codebase and clear internal module boundaries:
- source
- catalog
- library
- translation
- reader
- identity
- jobs

### 2.4 Async for Expensive Work
Do not block user reads on:
- episode refresh
- translation generation
- ranking sync

### 2.5 Observable by Default
Track:
- source fetch failures
- translation failures and cost
- job retries
- registration and reading flow errors

---

## 3. In-Scope Functionality

### 3.1 Discovery and Registration
- browse Syosetu ranking data
- register novels by URL or `ncode`
- view normalized novel details and episode lists

### 3.2 Library and Progress
- subscribe and unsubscribe
- maintain a personal library
- persist last-read episode, language, and reading position
- show continue-reading prominently

### 3.3 Content Ingestion
- use official APIs for ranking and metadata
- fetch and parse episode bodies from Syosetu HTML
- apply rate limits, retries, and checksum-based change tracking

### 3.4 Translation
- Japanese to Korean only in the initial version
- use an OpenAI-compatible provider abstraction, targeting OpenRouter first
- run translation asynchronously with retry and failure states
- cache by episode, provider, model, prompt version, and source checksum

### 3.5 Reader Experience
- distraction-free single-column reader
- previous/next navigation
- JP/KR language toggle
- font size and theme controls
- graceful fallback when translation is unavailable

### 3.6 Internationalization
- UI languages: English and Korean
- content language remains separate from UI language

---

## 4. Explicit Out of Scope

Not part of the current product:
- OPDS feeds
- external reader integrations
- EPUB export
- plugin ecosystem
- whole-novel eager translation
- microservice decomposition

---

## 5. Technical Baseline

- full-stack web application, preferably Next.js + TypeScript
- PostgreSQL as the system of record
- Redis for queueing and short-lived caching
- background worker for ingestion and translation jobs
- REST-like explicit API contracts for product screens

---

## 6. Delivery Milestones

### M1. Source Registration Foundation
- parse URL and `ncode`
- fetch and upsert novel metadata
- serve novel detail shell

### M2. Episode Ingestion and Reader Baseline
- fetch and parse episodes
- persist source content
- deliver a basic reader for Japanese text

### M3. Library and Progress
- subscriptions
- library listing
- continue-reading and progress persistence

### M4. Translation Pipeline
- provider abstraction
- queued translation jobs
- Korean reader mode and translation status states

### M5. Ranking Discovery
- ranking sync
- ranking screen
- subscribe from ranking

### M6. Hardening and Docker
- logging and metrics basics
- retry policies and failure surfacing
- Docker-based local and deployable setup

---

## 7. Acceptance Criteria

- a user can register a Syosetu novel via URL or `ncode`
- a user can read ingested Japanese episodes in the web reader
- subscriptions and continue-reading work reliably
- Korean translation can be requested and read asynchronously
- the UI supports English and Korean
- the system runs locally with PostgreSQL and Redis and is Docker-ready

---

## 8. Risks and Constraints

- Syosetu HTML changes may break episode parsing
- upstream usage must remain rate-limited and respectful
- translation cost must be visible and controlled
- translation failures must never block original-language reading

---

## 9. Definition of Done

The product is done enough for v1 when:
- registration is reliable
- episode ingestion is resilient
- the reader is comfortable and stable
- library and progress support the resume loop cleanly
- Korean translation is asynchronous, cacheable, and observable
- local development and Docker deployment are straightforward

---

END
