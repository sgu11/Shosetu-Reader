import { getPublicRuntimeConfig } from "@/lib/env";

const modules = [
  "source",
  "catalog",
  "library",
  "translation",
  "reader",
  "identity",
  "jobs",
  "admin",
];

const firstMilestones = [
  "Health check and typed configuration",
  "PostgreSQL and Redis local setup",
  "Database migration workflow",
  "Novel registration and metadata sync",
];

export default function Home() {
  const config = getPublicRuntimeConfig();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-8 md:px-10 md:py-12">
      <section className="surface-card grid gap-8 overflow-hidden rounded-[28px] p-8 md:grid-cols-[1.3fr_0.9fr] md:p-10">
        <div className="space-y-6">
          <div className="inline-flex items-center rounded-full border hairline px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-muted">
            Phase 0 Foundation
          </div>
          <div className="space-y-4">
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight md:text-6xl">
              Shosetu Reader is scaffolded and ready for the first real backend
              slices.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-muted md:text-lg">
              The project now starts from a modular monolith foundation designed
              for registration, reading, resume flow, and asynchronous Korean
              translation.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-contrast transition-transform hover:-translate-y-0.5"
              href="/api/health"
            >
              Open health check
            </a>
            <a
              className="rounded-full border hairline px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-black/4 dark:hover:bg-white/6"
              href="https://nextjs.org/docs"
              rel="noreferrer"
              target="_blank"
            >
              Next.js docs
            </a>
          </div>
        </div>

        <div className="rounded-[24px] border hairline bg-surface-strong/70 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">
            Runtime
          </p>
          <dl className="mt-5 space-y-4 text-sm">
            <div className="flex items-center justify-between gap-4 border-b hairline pb-4">
              <dt className="text-muted">Environment</dt>
              <dd className="font-medium">{config.nodeEnv}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-b hairline pb-4">
              <dt className="text-muted">App URL</dt>
              <dd className="font-medium">{config.appUrl}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted">Health endpoint</dt>
              <dd className="font-medium">/api/health</dd>
            </div>
          </dl>
          <div className="reader-text mt-6 rounded-[20px] border hairline bg-background/80 p-5 text-sm leading-7 text-muted">
            Calm, Kindle-like reading UX and disciplined async pipelines remain
            the north star.
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="surface-card rounded-[24px] p-7">
          <h2 className="text-xl font-semibold">Module map</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
            Each product concern has its own module folder with `domain`,
            `application`, `infra`, and `api` sublayers ready for
            implementation.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {modules.map((moduleName) => (
              <div
                key={moduleName}
                className="rounded-full border hairline bg-background/70 px-4 py-2 text-sm font-medium"
              >
                {moduleName}
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card rounded-[24px] p-7">
          <h2 className="text-xl font-semibold">Immediate milestones</h2>
          <ul className="mt-5 space-y-3 text-sm leading-7 text-muted">
            {firstMilestones.map((milestone) => (
              <li
                key={milestone}
                className="flex items-start gap-3 rounded-[18px] border hairline bg-background/65 px-4 py-3"
              >
                <span className="mt-2 h-2.5 w-2.5 rounded-full bg-accent" />
                <span>{milestone}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
