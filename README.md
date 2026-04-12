# Shosetu Reader

Shosetu Reader is a calm web reading platform for Japanese web novels from Syosetu. The repository is now at the Phase 0 foundation stage: the Next.js app is scaffolded, the modular monolith directory layout is in place, and typed runtime configuration plus a health endpoint are ready.

## Stack

- Next.js 16 with App Router
- TypeScript
- Tailwind CSS 4
- Zod for runtime configuration validation

## Local setup

1. Copy `.env.example` to `.env`.
2. Fill in the database and Redis connection strings.
3. Install dependencies with `pnpm install`.
4. Start the app with `pnpm dev`.

The health check is available at `http://localhost:3000/api/health`.

## Commands

- `pnpm dev` starts the local development server
- `pnpm build` builds the production app
- `pnpm lint` runs ESLint
- `pnpm typecheck` runs TypeScript without emitting output
- `pnpm check` runs linting and type checking together

## Repository shape

```text
src/
  app/
  components/
  features/
  lib/
    cache/
    db/
    i18n/
    logger/
    queue/
  modules/
    admin/
    catalog/
    identity/
    jobs/
    library/
    reader/
    source/
    translation/
tests/
docs/
```

Each module is pre-split into `api`, `application`, `domain`, and `infra` folders so the first feature slices can land without reshaping the project.
