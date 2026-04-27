"use client";

import { useRouter } from "next/navigation";
import { NovelCover } from "@/components/novel-cover";
import { SourcePill } from "@/components/source-pill";
import { useTranslation } from "@/lib/i18n/client";
import type { SourceSite } from "@/modules/source/domain/source-adapter";

interface RankingRowItem {
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

interface Props {
  item: RankingRowItem;
  titleKo?: string;
  onRegister: () => void;
  registering: boolean;
}

export function RankingRow({ item, titleKo, onRegister, registering }: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const krTitle = titleKo ?? item.title;

  return (
    <div className="grid grid-cols-[40px_50px_1fr_auto_auto] items-center gap-4 border-b border-border py-3.5">
      <span className="font-serif text-2xl font-normal italic text-secondary">
        {item.rank}
      </span>
      <NovelCover jp={item.title} kr={titleKo ?? null} width={38} height={54} />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <SourcePill site={item.site} />
          <div className="truncate font-serif text-base font-medium leading-tight text-foreground">
            {krTitle}
          </div>
        </div>
        <div className="truncate font-jp text-[11.5px] text-muted">
          {titleKo ? `${item.title} · ` : ""}
          {item.authorName}
        </div>
      </div>
      <span className="font-mono text-[11px] text-secondary">
        {item.totalEpisodes ?? "—"} {t("ranking.eps")}
      </span>
      {item.novelId ? (
        <button
          type="button"
          onClick={() => router.push(`/novels/${item.novelId}`)}
          className="rounded-full border border-border-strong px-3 py-1.5 text-[11px] text-secondary transition-colors hover:bg-surface-strong"
        >
          {t("ranking.view")}
        </button>
      ) : (
        <button
          type="button"
          onClick={onRegister}
          disabled={registering}
          className="rounded-full border border-border-strong px-3 py-1.5 text-[11px] text-secondary transition-colors hover:bg-surface-strong disabled:opacity-50"
        >
          {registering ? "…" : `+ ${t("ranking.register")}`}
        </button>
      )}
    </div>
  );
}
