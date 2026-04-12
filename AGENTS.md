# Repository Guidelines

## Stack

- Next.js 16 (App Router) + TypeScript
- Drizzle ORM with PostgreSQL
- Redis + BullMQ for job queue (Phase 3+)
- Zod for validation
- Tailwind CSS 4
- Vitest for testing
- pnpm as package manager

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
  features/         Feature-specific UI modules
  lib/              Shared infrastructure (db, cache, queue, i18n, logger, env)
  modules/          Domain modules (modular monolith)
    source/         Syosetu API/HTML integration
    catalog/        Novel and episode domain
    library/        Subscriptions, progress, continue-reading
    translation/    Translation pipeline
    reader/         Reader content assembly
    identity/       Users, sessions, preferences
    jobs/           Job orchestration
    admin/          Ops visibility
  styles/           Global styles
tests/              Test files mirroring src/ structure
```

Each module has four layers:
- `domain/` — entities, enums, types
- `application/` — use cases, service functions
- `infra/` — database queries, external API calls
- `api/` — request/response schemas, validation (NOT route handlers)

API routes live in `src/app/api/` (Next.js App Router) and delegate to module application/service layers.

## Coding Conventions

- 2-space indentation (enforced by editor/formatter)
- `camelCase` for variables/functions, `PascalCase` for types/components
- Drizzle schema uses `snake_case` column names
- Prefer named exports over default exports (except Next.js pages/layouts)
- One concern per file; keep files focused and under ~200 lines where practical

## Testing

- Use vitest for unit and integration tests
- Mirror source structure under `tests/`
- Name test files `*.test.ts` or `*.test.tsx`
- Test domain logic and validation schemas; don't test framework wiring

## Commits

- Short imperative subjects: `Add novel registration endpoint`, `Fix episode checksum comparison`
- Include tests for new behavior or note why tests were impractical
