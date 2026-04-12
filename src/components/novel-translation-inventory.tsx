"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/client";

interface ModelCount {
  modelName: string;
  translatedEpisodes: number;
}

interface Props {
  novelId: string;
  translatedEpisodes: number;
  translatedByModel: ModelCount[];
}

function shortModelName(modelName: string): string {
  return modelName.split("/").pop() ?? modelName;
}

export function NovelTranslationInventory({
  novelId,
  translatedEpisodes,
  translatedByModel,
}: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function discardTranslations(modelName?: string) {
    const message = modelName
      ? t("translation.confirmDiscardModel").replace("{model}", shortModelName(modelName))
      : t("translation.confirmDiscardAll");

    if (!window.confirm(message)) {
      return;
    }

    const key = modelName ?? "all";
    setBusyKey(key);

    try {
      const res = await fetch(`/api/novels/${novelId}/translations/discard`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modelName ? { modelName } : {}),
      });

      if (res.ok) {
        router.refresh();
      }
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <section className="surface-card space-y-4 rounded-xl p-6">
      <div className="space-y-1">
        <h2 className="text-lg font-normal">{t("translation.inventoryTitle")}</h2>
        <p className="text-xs text-muted">{t("translation.inventorySubtitle")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-success/10 px-3 py-1 text-xs text-success">
          {t("translation.availableCount")} {translatedEpisodes}
        </span>
        <button
          type="button"
          onClick={() => discardTranslations()}
          disabled={translatedEpisodes === 0 || busyKey === "all"}
          className="rounded-full border border-error/30 px-3 py-1 text-xs text-error transition-colors hover:bg-error/5 disabled:opacity-50"
        >
          {busyKey === "all" ? t("translation.discarding") : t("translation.discardAll")}
        </button>
      </div>

      {translatedByModel.length === 0 ? (
        <p className="text-sm text-muted">{t("translation.inventoryEmpty")}</p>
      ) : (
        <div className="space-y-2">
          {translatedByModel.map((model) => (
            <div
              key={model.modelName}
              className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-foreground" title={model.modelName}>
                  {model.modelName}
                </p>
                <p className="text-xs text-muted">
                  {t("translation.availableCount")} {model.translatedEpisodes}
                </p>
              </div>

              <button
                type="button"
                onClick={() => discardTranslations(model.modelName)}
                disabled={busyKey === model.modelName}
                className="rounded-full border border-error/30 px-3 py-1 text-xs text-error transition-colors hover:bg-error/5 disabled:opacity-50"
              >
                {busyKey === model.modelName ? t("translation.discarding") : t("translation.discardModel")}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
