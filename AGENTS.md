# Repository Guidelines

## Stack

- Next.js 16 (App Router) + TypeScript
- Drizzle ORM with PostgreSQL
- OpenRouter (OpenAI-compatible) for JP→KR translation
- Zod for validation
- Tailwind CSS 4 (dark-mode-native, Supabase-inspired)
- Vitest for testing
- pnpm as package manager
- Docker for production deployment

## Commands

- `pnpm dev` — start local dev server
- `pnpm build` — production build
- `pnpm lint` — ESLint
- `pnpm typecheck` — TypeScript check
- `pnpm check` — lint + typecheck together
- `pnpm test` — run vitest
- `pnpm db:generate` — generate Drizzle migrations
- `pnpm db:migrate` — apply migrations
- `pnpm db:studio` — open Drizzle Studio

## Project Structure

```
src/
  app/              Next.js App Router pages and API routes
  components/       Shared React components
  lib/              Shared infrastructure (db, i18n, auth, rate-limit)
  modules/          Domain modules (modular monolith)
    source/         Syosetu API/HTML integration
    catalog/        Novel and episode domain
    library/        Subscriptions, progress, continue-reading
    translation/    Translation pipeline (OpenRouter)
    reader/         Reader content assembly
    identity/       Users, sessions, preferences
    jobs/           Background job orchestration
    admin/          Ops visibility
tests/              Test files mirroring src/ structure
drizzle/            SQL migration files
```

Each module has four layers:
- `domain/` — entities, enums, types
- `application/` — use cases, service functions
- `infra/` — database queries, external API calls
- `api/` — request/response schemas, validation (NOT route handlers)

API routes live in `src/app/api/` (Next.js App Router) and delegate to module application/service layers.

## Key Architecture Decisions

- **Reader preferences** (font, size, line height, width, weight) are stored in a per-device cookie (`reader-prefs`), not in the database
- **Settings API** (`/api/settings`) handles only locale, readerLanguage, and theme — not reader font settings
- **Translation** is async via OpenRouter with configurable model and per-novel prompts
- **Bulk operations** (ingest-all, translate-all) run as background jobs with progress feedback
- **i18n** uses EN/KR dictionaries in `src/lib/i18n/dictionaries.ts` with cookie-based locale persistence

### V3 Translation Architecture (planned — see `docs/v3-architecture.md`)

- **Structured glossary**: `novel_glossary_entries` table with per-term CRUD (category, importance 1-5, reading). "Generate" produces both structured entries and a prose-only style guide in one LLM call. Style guide (tone/register only) remains as free text in `novel_glossaries.glossary`.
- **Living glossary updates**: `glossary.extract` background job auto-extracts up to 5 new terms after each episode translation. Entries are auto-confirmed with LLM-assigned importance (1-5). 200-entry confirmed cap (`MAX_CONFIRMED_ENTRIES`) with lowest-importance eviction. Render cap configurable via `GLOSSARY_MAX_PROMPT_ENTRIES` env (default 200).
- **Translation sessions**: `translation_sessions` table groups sequential bulk translations. Each episode carries a rolling context summary (~2000 chars) from prior episodes to maintain consistency.
- **Prompt caching layout**: System message (stable: base rules + glossary + global prompt) → context message (per-session: rolling summary) → source message (per-episode). Maximizes prefix cache hits on Anthropic/Google models.
- **Episode chunking**: Long episodes (>12K chars) split at paragraph boundaries with overlap context. Adaptive `max_tokens` based on source length.
- **Quality validation**: Post-translation checks (length ratio, untranslated segments, glossary compliance) stored as `quality_warnings` JSONB on translation rows.
- **Prompt version**: `"v3"` for session-based translations; sessionless translations keep `"v2"`.

## Coding Conventions

- 2-space indentation
- `camelCase` for variables/functions, `PascalCase` for types/components
- Drizzle schema uses `snake_case` column names
- Prefer named exports over default exports (except Next.js pages/layouts)
- One concern per file; keep files focused and under ~200 lines where practical

## Testing

- Use vitest for unit and integration tests
- Mirror source structure under `tests/`
- Name test files `*.test.ts` or `*.test.tsx`
- Test domain logic and validation schemas; don't test framework wiring

## Environments

### Local Development (default)

Use this unless the user explicitly asks for a production deploy.

- **Dev server**: `pnpm dev` (port 3000, Turbopack)
- **Database**: PostgreSQL 17 on localhost:5432, database `shosetu_reader`
- **Env file**: `.env` (DATABASE_URL, OPENROUTER_API_KEY, etc.)
- **Applying migrations locally**: Use `psql postgresql://localhost:5432/shosetu_reader -f drizzle/<migration>.sql` directly. **Stop the dev server first** — the dev server holds connection pools that block DDL (ALTER TABLE) statements.
- **`drizzle-kit push`** requires TTY (interactive prompts), so it may not work from non-interactive shells. Use direct psql for migrations instead.

### Production

- **Stack**: Docker Compose with `app` (Next.js standalone) + `worker` + `db` (postgres:16-alpine) + `redis`
- **Env file**: `.env.production` (OPENROUTER_API_KEY, OPENROUTER_DEFAULT_MODEL, ADMIN_API_KEY)
- **Migrations**: Run automatically on container start via `docker-entrypoint.sh` → `node migrate.mjs`
- **Deploy**: `docker compose up -d --build`

## Commits

- Short imperative subjects: `Add novel registration endpoint`, `Fix episode checksum comparison`
- Include tests for new behavior or note why tests were impractical
