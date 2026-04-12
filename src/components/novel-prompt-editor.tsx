"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "@/lib/i18n/client";

interface Props {
  novelId: string;
}

export function NovelPromptEditor({ novelId }: Props) {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/novels/${novelId}/translation-prompt`)
      .then((res) => res.json())
      .then((data) => {
        setPrompt(data.prompt ?? "");
      })
      .catch(() => {});
  }, [novelId]);

  const save = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch(`/api/novels/${novelId}/translation-prompt`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }, [novelId, prompt]);

  return (
    <section className="surface-card space-y-3 rounded-xl p-6">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <h2 className="text-base font-medium">{t("novelPrompt.title")}</h2>
          <p className="text-xs text-muted">{t("novelPrompt.subtitle")}</p>
        </div>
        <span className="text-muted">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="space-y-3 pt-2">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={6}
            className="w-full rounded-md border border-border bg-background px-4 py-3 text-sm leading-relaxed text-foreground placeholder:text-muted/50 focus:border-border-strong focus:outline-none"
            placeholder={t("novelPrompt.placeholder")}
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
            {saved && (
              <span className="text-xs text-accent">{t("settings.saved")}</span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
