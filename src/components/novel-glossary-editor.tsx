"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "@/lib/i18n/client";

interface Props {
  novelId: string;
}

export function NovelGlossaryEditor({ novelId }: Props) {
  const { t } = useTranslation();
  const [glossary, setGlossary] = useState("");
  const [meta, setMeta] = useState<{
    modelName: string | null;
    episodeCount: number | null;
    generatedAt: string | null;
  }>({ modelName: null, episodeCount: null, generatedAt: null });
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetch(`/api/novels/${novelId}/glossary`)
      .then((res) => res.json())
      .then((data) => {
        setGlossary(data.glossary ?? "");
        setMeta({
          modelName: data.modelName ?? null,
          episodeCount: data.episodeCount ?? null,
          generatedAt: data.generatedAt ?? null,
        });
      })
      .catch(() => {});
  }, [novelId]);

  const save = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch(`/api/novels/${novelId}/glossary`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ glossary }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }, [novelId, glossary]);

  const generate = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/novels/${novelId}/glossary`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Generation failed");
        return;
      }
      setGlossary(data.glossary ?? "");
      setMeta({
        modelName: data.modelName ?? null,
        episodeCount: data.episodeCount ?? null,
        generatedAt: new Date().toISOString(),
      });
      setOpen(true);
    } catch {
      alert("Network error");
    } finally {
      setGenerating(false);
    }
  }, [novelId]);

  return (
    <section className="surface-card space-y-3 rounded-xl p-6">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <h2 className="text-base font-medium">{t("glossary.title")}</h2>
          <p className="text-xs text-muted">{t("glossary.subtitle")}</p>
        </div>
        <span className="text-muted">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="space-y-3 pt-2">
          {meta.generatedAt && (
            <p className="text-xs text-muted">
              {t("glossary.generatedInfo", {
                episodes: meta.episodeCount ?? 0,
                date: new Date(meta.generatedAt).toLocaleDateString(),
              })}
            </p>
          )}

          <textarea
            value={glossary}
            onChange={(e) => setGlossary(e.target.value)}
            rows={12}
            className="w-full rounded-md border border-border bg-background px-4 py-3 text-sm leading-relaxed text-foreground placeholder:text-muted/50 focus:border-border-strong focus:outline-none"
            placeholder={t("glossary.placeholder")}
          />

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="btn-pill btn-accent text-xs"
            >
              {saving ? t("settings.saving") : t("settings.save")}
            </button>
            <button
              type="button"
              onClick={generate}
              disabled={generating}
              className="btn-pill btn-secondary text-xs"
            >
              {generating ? t("glossary.generating") : t("glossary.generate")}
            </button>
            {saved && (
              <span className="text-xs text-accent">{t("settings.saved")}</span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
