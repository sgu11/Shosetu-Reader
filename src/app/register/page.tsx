"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eyebrow } from "@/components/eyebrow";
import { NovelCover } from "@/components/novel-cover";
import { R18Pill, SourcePill } from "@/components/source-pill";
import { useTranslation } from "@/lib/i18n/client";
import type { SourceSite } from "@/modules/source/domain/source-adapter";

interface RegisterResult {
  novel: {
    id: string;
    sourceId: string;
    sourceSite?: SourceSite;
    titleJa: string;
    titleKo?: string | null;
    authorName: string | null;
    summaryJa: string | null;
    totalEpisodes: number | null;
    isCompleted: boolean | null;
  };
  isNew: boolean;
}

interface DetectedInput {
  site: SourceSite;
  id: string;
}

interface RecentItem {
  novelId: string;
  titleJa: string;
  titleKo: string | null;
  subscribedAt: string;
}

const FORMATS: Array<{ site: SourceSite; example: string; idHint: string }> = [
  { site: "syosetu",    example: "https://ncode.syosetu.com/",            idHint: "n9669bk" },
  { site: "nocturne",   example: "https://novel18.syosetu.com/",          idHint: "n5555aa" },
  { site: "kakuyomu",   example: "https://kakuyomu.jp/works/",            idHint: "16817330663128467540" },
  { site: "alphapolis", example: "https://www.alphapolis.co.jp/novel/",   idHint: "101715426/813048051" },
];

function detectInput(raw: string): DetectedInput | null {
  const v = raw.trim();
  if (!v) return null;
  let m: RegExpMatchArray | null;
  if ((m = v.match(/ncode\.syosetu\.com\/(n[a-z0-9]+)/i))) {
    return { site: "syosetu", id: m[1].toLowerCase() };
  }
  if ((m = v.match(/novel18\.syosetu\.com\/(n[a-z0-9]+)/i))) {
    return { site: "nocturne", id: m[1].toLowerCase() };
  }
  if ((m = v.match(/kakuyomu\.jp\/works\/(\d+)/i))) {
    return { site: "kakuyomu", id: m[1] };
  }
  if ((m = v.match(/alphapolis\.co\.jp\/novel\/(\d+\/\d+)/i))) {
    return { site: "alphapolis", id: m[1] };
  }
  if (/^n[a-z0-9]+$/i.test(v)) return { site: "syosetu", id: v.toLowerCase() };
  if (/^\d+\/\d+$/.test(v)) return { site: "alphapolis", id: v };
  if (/^\d{15,20}$/.test(v)) return { site: "kakuyomu", id: v };
  return null;
}

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RegisterResult | null>(null);
  const [recent, setRecent] = useState<RecentItem[]>([]);

  const detected = useMemo(() => detectInput(input), [input]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/library?limit=3")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.items) return;
        const items: RecentItem[] = data.items.slice(0, 3).map(
          (it: {
            novelId: string;
            titleJa: string;
            titleKo: string | null;
            subscribedAt: string;
          }) => ({
            novelId: it.novelId,
            titleJa: it.titleJa,
            titleKo: it.titleKo,
            subscribedAt: it.subscribedAt,
          }),
        );
        setRecent(items);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const res = await fetch("/api/novels/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Registration failed");
        return;
      }
      setResult(data);
    } catch {
      setError(t("register.networkError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="frame-paper paper-grain flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-14 py-10">
        <header>
          <Eyebrow>{t("register.eyebrow")}</Eyebrow>
          <h1 className="mt-2 mb-1 font-serif text-5xl font-normal italic tracking-tight text-foreground md:text-6xl">
            {t("register.headlineFlair")}{" "}
            <span className="not-italic">{t("register.headlineMain")}</span>
          </h1>
          <p className="m-0 text-sm text-secondary">{t("register.tagline")}</p>
        </header>

        <form
          onSubmit={handleSubmit}
          className={`flex items-stretch gap-1.5 rounded-md border bg-surface p-1.5 transition-colors ${
            detected ? "border-accent" : "border-border focus-within:border-border-strong"
          }`}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="https://ncode.syosetu.com/n…  ·  https://kakuyomu.jp/works/…  ·  https://www.alphapolis.co.jp/novel/…"
            className="flex-1 bg-transparent px-3 py-3 font-mono text-[13px] tracking-wide text-foreground placeholder:text-muted/60 focus:outline-none"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim() || !detected}
            className={`rounded-[4px] px-5 text-[13px] font-semibold transition-colors ${
              detected && !loading
                ? "bg-deep text-accent-contrast"
                : "bg-accent-soft text-muted/80 cursor-not-allowed"
            }`}
          >
            {loading ? "…" : `${t("register.submit")} →`}
          </button>
        </form>

        <div className="flex items-center gap-3 font-mono text-[11px] tracking-wide">
          {detected ? (
            <>
              <span className="text-accent">● {t("register.detectedOk")}</span>
              <span className="text-muted/60">→</span>
              <SourcePill site={detected.site} variant="full" />
              {detected.site === "nocturne" ? <R18Pill /> : null}
              <span className="text-muted/60">·</span>
              <span className="text-foreground">{detected.id}</span>
              <span className="text-muted/60">·</span>
              <span className="text-muted">parseInput</span>
            </>
          ) : (
            <span className="text-muted">{t("register.detectedWaiting")}</span>
          )}
        </div>

        {error ? (
          <div className="rounded-md border border-error/30 bg-error/5 px-5 py-4 text-sm text-error">
            {error}
          </div>
        ) : null}

        {result ? (
          <article
            className="grid items-center gap-5 rounded-md border border-accent-soft p-5 md:grid-cols-[80px_1fr_auto]"
            style={{
              background:
                "linear-gradient(180deg, color-mix(in oklab, var(--accent-soft) 18%, transparent), color-mix(in oklab, var(--accent-soft) 4%, transparent))",
            }}
          >
            <NovelCover
              jp={result.novel.titleJa}
              kr={result.novel.titleKo ?? null}
              ncode={result.novel.sourceId}
              width={80}
              height={112}
            />
            <div className="flex min-w-0 flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <SourcePill site={result.novel.sourceSite ?? detected?.site ?? "syosetu"} />
                {(result.novel.sourceSite ?? detected?.site) === "nocturne" ? <R18Pill /> : null}
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
                  {result.novel.sourceId}
                </span>
                <span className="rounded-full border border-accent/40 bg-accent/10 px-2 py-[2px] text-[10px] font-medium text-accent">
                  {result.isNew ? t("register.newlyRegistered") : t("register.alreadyRegistered")}
                </span>
              </div>
              <h2 className="m-0 text-[18px] font-semibold leading-tight tracking-tight text-foreground">
                {result.novel.titleKo ?? result.novel.titleJa}
              </h2>
              {result.novel.titleKo ? (
                <span className="font-jp text-[12.5px] text-muted">{result.novel.titleJa}</span>
              ) : null}
              {result.novel.authorName ? (
                <span className="text-[12px] text-secondary">{result.novel.authorName}</span>
              ) : null}
              {result.novel.summaryJa ? (
                <p className="m-0 line-clamp-2 text-[12.5px] leading-relaxed text-secondary">
                  {result.novel.summaryJa}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-3 font-mono text-[10.5px] uppercase tracking-wider text-muted">
                {result.novel.totalEpisodes != null ? (
                  <span>
                    <strong className="font-sans text-[12px] text-foreground">
                      {result.novel.totalEpisodes}
                    </strong>{" "}
                    {t("register.episodes")}
                  </span>
                ) : null}
                {result.novel.isCompleted != null ? (
                  <>
                    <span className="text-muted/40">·</span>
                    <span>
                      {result.novel.isCompleted
                        ? t("register.completed")
                        : t("register.ongoing")}
                    </span>
                  </>
                ) : null}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => router.push(`/novels/${result.novel.id}`)}
                className="btn-pill btn-primary text-[12px]"
              >
                {t("register.viewDetails")} →
              </button>
            </div>
          </article>
        ) : null}

        <section className="grid gap-2 sm:grid-cols-2">
          {FORMATS.map((f) => (
            <div
              key={f.site}
              className="flex flex-col gap-1.5 rounded-[4px] border border-border bg-surface px-4 py-3"
            >
              <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-wider text-secondary">
                <SourcePill site={f.site} />
                <span>{t(`source.${f.site}` as never) as string}</span>
              </div>
              <div className="font-mono text-[11px] text-muted">
                <span className="text-foreground/80">{f.example}</span>
                {f.idHint}
              </div>
            </div>
          ))}
        </section>

        {recent.length > 0 ? (
          <section className="mt-2">
            <h3 className="mb-2 flex items-center gap-3 font-mono text-[10.5px] uppercase tracking-[0.24em] text-muted">
              <span className="h-px flex-1 bg-border" />
              {t("register.recent")}
              <span className="h-px flex-1 bg-border" />
            </h3>
            <ul className="flex flex-col border-t border-border">
              {recent.map((r) => (
                <li
                  key={r.novelId}
                  className="grid grid-cols-[80px_1fr_auto] items-center gap-4 border-b border-border py-2.5 text-[12px]"
                >
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
                    {new Date(r.subscribedAt).toLocaleDateString()}
                  </span>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-[13px] font-medium text-foreground">
                      {r.titleKo ?? r.titleJa}
                    </span>
                    {r.titleKo ? (
                      <span className="truncate font-jp text-[11px] text-muted">
                        {r.titleJa}
                      </span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push(`/novels/${r.novelId}`)}
                    className="rounded-full border border-border-strong px-3 py-1.5 text-[11px] text-secondary transition-colors hover:bg-surface-strong"
                  >
                    {t("register.read")} →
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </main>
  );
}
