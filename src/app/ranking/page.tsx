"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eyebrow } from "@/components/eyebrow";
import { RankingHero } from "@/components/ranking/ranking-hero";
import { RankingRow } from "@/components/ranking/ranking-row";
import { R18Pill, SourcePill } from "@/components/source-pill";
import { useTranslation } from "@/lib/i18n/client";
import type { TranslationKey } from "@/lib/i18n";
import type { RankingPeriod, SourceSite } from "@/modules/source/domain/source-adapter";

type Scope = "sfw" | "all" | SourceSite;

interface SectionItem {
  rank: number;
  site: SourceSite;
  sourceId: string;
  title: string;
  authorName: string;
  totalEpisodes: number | null;
  isCompleted: boolean | null;
  sourceUrl: string;
  novelId: string | null;
}

interface Section {
  site: SourceSite;
  status: "ok" | "timeout" | "error";
  errorMessage: string | null;
  items: SectionItem[];
}

const SCOPES: ReadonlyArray<Scope> = ["sfw", "all", "syosetu", "nocturne", "kakuyomu", "alphapolis"];

const PERIOD_BY_SCOPE: Record<Scope, RankingPeriod[]> = {
  sfw: ["daily", "weekly", "monthly", "quarterly"],
  all: ["daily", "weekly", "monthly"],
  syosetu: ["daily", "weekly", "monthly", "quarterly"],
  nocturne: ["daily", "weekly", "monthly", "quarterly"],
  kakuyomu: ["daily", "weekly", "monthly", "yearly", "entire"],
  alphapolis: ["hot"],
};

export default function RankingPage() {
  const { t } = useTranslation();
  const [scope, setScope] = useState<Scope>("syosetu");
  const [period, setPeriod] = useState<RankingPeriod>("daily");
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState<string | null>(null);
  const [titleKo, setTitleKo] = useState<Record<string, string>>({});
  const [translating, setTranslating] = useState(false);

  const periods = PERIOD_BY_SCOPE[scope];

  // Auto-correct period when scope changes if current period isn't supported
  useEffect(() => {
    if (!periods.includes(period)) {
      setPeriod(periods[0]);
    }
  }, [scope, periods, period]);

  const itemKey = useCallback((it: SectionItem) => `${it.site}::${it.sourceId}`, []);

  const translateTitles = useCallback(async (allItems: SectionItem[]) => {
    if (allItems.length === 0) return;
    setTranslating(true);
    try {
      const titles = allItems.map((i) => i.title);
      const res = await fetch("/api/ranking/translate-titles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titles }),
      });
      if (res.ok) {
        const data = await res.json();
        const map: Record<string, string> = {};
        allItems.forEach((item, idx) => {
          if (data.translations[idx] && data.translations[idx] !== item.title) {
            map[itemKey(item)] = data.translations[idx];
          }
        });
        setTitleKo(map);
      }
    } catch {
      // best-effort
    } finally {
      setTranslating(false);
    }
  }, [itemKey]);

  const fetchRanking = useCallback(
    async (s: Scope, p: RankingPeriod) => {
      setLoading(true);
      setTitleKo({});
      try {
        const url = `/api/ranking?scope=${encodeURIComponent(s)}&period=${encodeURIComponent(p)}&limit=20`;
        const res = await fetch(url);
        if (!res.ok) {
          setSections([]);
          return;
        }
        const data = await res.json();
        let next: Section[];
        if (Array.isArray(data.items)) {
          // Legacy single-list path for syosetu scope.
          next = [
            {
              site: "syosetu" as SourceSite,
              status: "ok",
              errorMessage: null,
              items: data.items.map((i: { rank: number; ncode: string; title: string; authorName: string; totalEpisodes: number; isCompleted: boolean; sourceUrl: string; novelId: string | null }) => ({
                rank: i.rank,
                site: "syosetu" as SourceSite,
                sourceId: i.ncode,
                title: i.title,
                authorName: i.authorName,
                totalEpisodes: i.totalEpisodes,
                isCompleted: i.isCompleted,
                sourceUrl: i.sourceUrl,
                novelId: i.novelId,
              })),
            },
          ];
        } else {
          next = (data.sections ?? []) as Section[];
        }
        setSections(next);
        const flat = next.flatMap((sec) => sec.items);
        translateTitles(flat);
      } catch {
        setSections([]);
      } finally {
        setLoading(false);
      }
    },
    [translateTitles],
  );

  useEffect(() => {
    fetchRanking(scope, period);
  }, [scope, period, fetchRanking]);

  const handleRegister = useCallback(async (item: SectionItem) => {
    const key = itemKey(item);
    setRegistering(key);
    try {
      const res = await fetch("/api/novels/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: item.sourceUrl }),
      });
      if (res.ok) {
        const data = await res.json();
        setSections((prev) =>
          prev.map((sec) =>
            sec.site === item.site
              ? {
                  ...sec,
                  items: sec.items.map((it) =>
                    it.sourceId === item.sourceId ? { ...it, novelId: data.novel.id } : it,
                  ),
                }
              : sec,
          ),
        );
      }
    } catch {
      // silent
    } finally {
      setRegistering(null);
    }
  }, [itemKey]);

  const totalItems = useMemo(
    () => sections.reduce((sum, s) => sum + s.items.length, 0),
    [sections],
  );

  return (
    <main className="frame-paper paper-grain flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-14 py-10">
        <header className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <Eyebrow>{t("ranking.eyebrow")}</Eyebrow>
            <h1 className="mt-2 mb-1 font-serif text-5xl font-normal tracking-tight text-foreground md:text-6xl">
              <span className="italic">{t("ranking.headlineFlair")}</span>{" "}
              {t("ranking.headlineMain")}
            </h1>
            <p className="m-0 font-serif text-sm text-secondary">
              {t("ranking.tagline")}
            </p>
          </div>

          <div className="surface-card flex gap-1 rounded-full p-1">
            {periods.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                  period === p
                    ? "bg-deep text-accent-contrast"
                    : "text-secondary hover:bg-surface-strong"
                }`}
              >
                {t(`ranking.period.${p}` as TranslationKey)}
              </button>
            ))}
          </div>
        </header>

        <div className="surface-card flex flex-wrap gap-1 rounded-full p-1 self-start">
          {SCOPES.map((s) => {
            const isSiteScope = s !== "sfw" && s !== "all";
            const swatchColor = isSiteScope ? `var(--src-${s})` : undefined;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setScope(s)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  scope === s
                    ? "bg-deep text-accent-contrast"
                    : "text-secondary hover:bg-surface-strong"
                }`}
              >
                {isSiteScope && scope !== s ? (
                  <span
                    aria-hidden
                    className="source-swatch"
                    style={{ color: swatchColor }}
                  />
                ) : null}
                {s === "sfw" || s === "all"
                  ? t(`ranking.scope.${s}` as TranslationKey)
                  : t(`source.${s}` as TranslationKey)}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="surface-card rounded-xl p-8 text-center text-sm text-muted">
            {t("ranking.loading")}
          </div>
        ) : totalItems === 0 ? (
          <div className="surface-card rounded-xl p-8 text-center text-sm text-muted">
            {t("ranking.empty")}
          </div>
        ) : (
          <>
            {sections.map((section) => (
              <section key={section.site} className="flex flex-col gap-3">
                {sections.length > 1 ? (
                  <div className="section-header-row">
                    <h2>
                      <SourcePill site={section.site} variant="full" />
                      {section.site === "nocturne" ? <R18Pill /> : null}
                      <span className="count">
                        TOP {section.items.length} ·{" "}
                        {section.status === "ok"
                          ? "OK"
                          : section.status === "timeout"
                            ? "TIMEOUT"
                            : "ERROR"}
                      </span>
                    </h2>
                    <div className="meta">
                      {section.status === "ok"
                        ? t(`source.${section.site}` as TranslationKey)
                        : section.status === "timeout"
                          ? t("ranking.sectionTimeout")
                          : t("ranking.sectionError")}
                    </div>
                  </div>
                ) : null}

                {section.items.length > 0 ? (
                  <>
                    {section.items[0] ? (
                      <RankingHero
                        item={section.items[0]}
                        titleKo={titleKo[itemKey(section.items[0])]}
                        onRegister={() => handleRegister(section.items[0])}
                        registering={registering === itemKey(section.items[0])}
                      />
                    ) : null}
                    <div>
                      {section.items.slice(1).map((item) => {
                        const key = itemKey(item);
                        return (
                          <RankingRow
                            key={key}
                            item={item}
                            titleKo={titleKo[key]}
                            onRegister={() => handleRegister(item)}
                            registering={registering === key}
                          />
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <p className="py-4 text-center text-xs text-muted">
                    {section.status === "timeout"
                      ? t("ranking.sectionTimeout")
                      : section.status === "error"
                        ? t("ranking.sectionError")
                        : t("ranking.empty")}
                  </p>
                )}
              </section>
            ))}

            {translating ? (
              <p className="py-2 text-center text-xs text-muted">
                <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent align-middle" />
                {t("ranking.translatingTitles")}
              </p>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
