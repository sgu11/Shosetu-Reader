import Link from "next/link";
import { getContinueReading } from "@/modules/library/application/get-library";

export default async function Home() {
  let continueItems: Awaited<ReturnType<typeof getContinueReading>> = [];

  try {
    continueItems = await getContinueReading();
  } catch {
    // DB not ready or no user yet — render empty
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-10">
      {/* Hero */}
      <section className="space-y-4">
        <h1 className="text-4xl font-normal leading-none tracking-tight md:text-5xl">
          Shosetu Reader
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-muted">
          A calm reading environment for Japanese web novels from Syosetu, with
          resume flow and Korean translation.
        </p>
        <div className="flex gap-3">
          <Link href="/register" className="btn-pill btn-accent">
            Add novel
          </Link>
          <Link href="/library" className="btn-pill btn-secondary">
            My library
          </Link>
        </div>
      </section>

      {/* Continue reading */}
      {continueItems.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-normal">Continue reading</h2>
          <div className="space-y-1">
            {continueItems.map((item) => (
              <Link
                key={item.episodeId}
                href={`/reader/${item.episodeId}`}
                className="surface-card flex items-center justify-between rounded-xl px-6 py-4 transition-colors hover:border-border-strong hover:bg-surface-strong"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {item.titleJa}
                  </p>
                  <p className="text-xs text-muted">
                    #{item.episodeNumber}
                    {item.episodeTitle && ` — ${item.episodeTitle}`}
                  </p>
                </div>
                <span className="ml-4 shrink-0 text-xs text-muted">
                  {new Date(item.lastReadAt).toLocaleDateString()}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
