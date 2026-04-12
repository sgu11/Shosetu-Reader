import Link from "next/link";
import { getLibrary } from "@/modules/library/application/get-library";

export default async function LibraryPage() {
  const { items, totalCount } = await getLibrary();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-normal leading-none tracking-tight">
          Library
        </h1>
        <p className="text-sm text-muted">
          {totalCount} subscribed {totalCount === 1 ? "novel" : "novels"}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="surface-card rounded-xl p-8 text-center text-sm text-muted">
          <p>Your library is empty.</p>
          <p className="mt-2">
            <Link href="/register" className="text-accent hover:text-accent-hover transition-colors">
              Register a novel
            </Link>{" "}
            and subscribe to start reading.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Link
              key={item.novelId}
              href={`/novels/${item.novelId}`}
              className="surface-card flex items-center justify-between rounded-xl px-6 py-4 transition-colors hover:border-border-strong hover:bg-surface-strong"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <h2 className="truncate text-sm font-medium">
                  {item.titleJa}
                </h2>
                <div className="flex items-center gap-3 text-xs text-muted">
                  {item.authorName && <span>{item.authorName}</span>}
                  {item.totalEpisodes != null && (
                    <span>{item.totalEpisodes} eps</span>
                  )}
                  {item.isCompleted != null && (
                    <span
                      className={
                        item.isCompleted
                          ? "text-success"
                          : "text-accent"
                      }
                    >
                      {item.isCompleted ? "Completed" : "Ongoing"}
                    </span>
                  )}
                </div>
              </div>

              <div className="ml-4 flex shrink-0 items-center gap-3">
                {item.currentEpisodeNumber != null && (
                  <span className="rounded-full bg-surface-strong px-3 py-1 text-xs text-muted">
                    Ep. {item.currentEpisodeNumber}
                  </span>
                )}
                {item.lastReadAt && (
                  <span className="text-xs text-muted">
                    {new Date(item.lastReadAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
