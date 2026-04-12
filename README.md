# Shosetu Reader

A calm web reading platform for Japanese web novels from Syosetu with Korean translation support. Built as a modular monolith with Next.js, PostgreSQL, and OpenRouter for JP→KR translation.

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS 4 (dark-mode-native, Supabase-inspired design system)
- Drizzle ORM + PostgreSQL
- OpenRouter (OpenAI-compatible) for JP→KR translation
- Docker for production deployment
- Zod for validation
- pnpm

## Features

- **Novel registration** via Syosetu URL or ncode
- **Episode ingestion** with batch and full-ingest modes
- **Web reader** with JA/KR toggle, per-device font/layout preferences (cookie-based)
- **Korean translation** pipeline via OpenRouter with model selection, retry, and re-translate
- **Personal library** with subscriptions, progress tracking, and continue-reading
- **Ranking discovery** from Syosetu (daily/weekly/monthly/quarterly)
- **Bilingual UI** (English/Korean) with cookie-based locale persistence
- **Per-novel translation prompts** for character names, tone, etc.

## Local Setup

1. Copy `.env.example` to `.env` and fill in `DATABASE_URL` and `OPENROUTER_API_KEY`.
2. `pnpm install`
3. `pnpm db:generate && pnpm db:migrate` (or `npx drizzle-kit push` for dev)
4. `pnpm dev`

Health check: `http://localhost:3000/api/health`

## Production (Docker)

```bash
docker compose up -d --build
```

The app runs at port 3000 with auto-migration on startup via `docker-entrypoint.sh`.

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start local dev server |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript check |
| `pnpm check` | Lint + typecheck |
| `pnpm test` | Run vitest |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:studio` | Open Drizzle Studio |

## Repository Structure

```text
src/
  app/              Next.js App Router pages and API routes
  components/       Shared React components
  lib/              Shared infrastructure
    db/             Drizzle ORM schema and client
    i18n/           EN/KR dictionaries, locale provider
    auth/           Default user management
    rate-limit/     API rate limiting
  modules/          Domain modules (modular monolith)
    source/         Syosetu API/HTML integration
    catalog/        Novel and episode domain
    library/        Subscriptions, progress, continue-reading
    translation/    Translation pipeline (OpenRouter)
    reader/         Reader content assembly
    identity/       Users, sessions, preferences
    jobs/           Background job orchestration
    admin/          Ops visibility
```

## API Surface (22 endpoints)

### Discovery & Registration
- `POST /api/novels/register`
- `GET /api/ranking`
- `POST /api/ranking/translate-titles`

### Novel & Episodes
- `GET /api/novels/[novelId]`
- `GET /api/novels/[novelId]/episodes`
- `POST /api/novels/[novelId]/ingest`
- `POST /api/novels/[novelId]/ingest-all`
- `GET/PUT /api/novels/[novelId]/translation-prompt`

### Translation
- `POST /api/novels/[novelId]/bulk-translate`
- `POST /api/novels/[novelId]/bulk-translate-all`
- `POST /api/translations/episodes/[episodeId]/request`
- `GET /api/translations/episodes/[episodeId]/status`
- `GET/PUT /api/translation-settings`

### Library & Progress
- `GET /api/library`
- `POST/DELETE /api/library/[novelId]/subscribe`
- `PUT /api/progress`

### Reader & Settings
- `GET /api/reader/episodes/[episodeId]`
- `GET/PUT /api/settings`
- `GET /api/openrouter/models`

### Admin
- `GET /api/health`
- `GET /api/admin/jobs`
- `GET /api/admin/translations`

## Pages (7 screens + framework `_not-found`)

- **Home** — hero + continue reading
- **Library** — subscribed novels with progress
- **Ranking** — daily/weekly/monthly/quarterly tabs
- **Register** — URL or ncode input
- **Novel detail** — episodes, subscribe, unified actions menu (ingest + translate)
- **Reader** — JA/KR toggle, font settings, prev/next navigation
- **Settings** — locale, theme, translation model, global prompt
