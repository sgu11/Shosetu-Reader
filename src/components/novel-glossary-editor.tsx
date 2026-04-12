"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "@/lib/i18n/client";

interface ModelOption {
  id: string;
  name: string;
}

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

  // Model selector state
  const [selectedModel, setSelectedModel] = useState("");
  const [models, setModels] = useState<ModelOption[]>([]);
  const [modelSearch, setModelSearch] = useState("");
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

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

  // Load user's default model for pre-selection
  useEffect(() => {
    fetch("/api/translation-settings")
      .then((res) => res.json())
      .then((data) => {
        if (!selectedModel) {
          setSelectedModel(data.modelName ?? "");
        }
      })
      .catch(() => {});
  }, [selectedModel]);

  // Load available models
  useEffect(() => {
    fetch("/api/openrouter/models")
      .then((res) => res.json())
      .then((data) => setModels(data.models ?? []))
      .catch(() => {});
  }, []);

  // Close picker on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setModelPickerOpen(false);
      }
    }
    if (modelPickerOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [modelPickerOpen]);

  const filteredModels = modelSearch.trim()
    ? models.filter(
        (m) =>
          m.id.toLowerCase().includes(modelSearch.toLowerCase()) ||
          m.name.toLowerCase().includes(modelSearch.toLowerCase()),
      )
    : models;

  const shortModel = (id: string) => id.split("/").pop() ?? id;

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: selectedModel || undefined }),
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
  }, [novelId, selectedModel]);

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
              {meta.modelName && (
                <span className="ml-2 code-label">{shortModel(meta.modelName)}</span>
              )}
            </p>
          )}

          <textarea
            value={glossary}
            onChange={(e) => setGlossary(e.target.value)}
            rows={12}
            className="w-full rounded-md border border-border bg-background px-4 py-3 text-sm leading-relaxed text-foreground placeholder:text-muted/50 focus:border-border-strong focus:outline-none"
            placeholder={t("glossary.placeholder")}
          />

          {/* Model selector for generation */}
          <div className="relative" ref={pickerRef}>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">{t("glossary.model")}:</span>
              <button
                type="button"
                onClick={() => setModelPickerOpen(!modelPickerOpen)}
                className="code-label cursor-pointer hover:bg-surface-strong transition-colors"
              >
                {selectedModel ? shortModel(selectedModel) : "—"}
              </button>
            </div>

            {modelPickerOpen && (
              <div className="absolute left-0 top-full z-20 mt-1 w-80 rounded-lg border border-border bg-surface p-2 shadow-lg">
                <input
                  type="text"
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                  placeholder={t("settings.searchModels")}
                  className="mb-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted/50 focus:border-border-strong focus:outline-none"
                  autoFocus
                />
                <div className="max-h-48 overflow-y-auto">
                  {filteredModels.slice(0, 30).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setSelectedModel(m.id);
                        setModelPickerOpen(false);
                        setModelSearch("");
                      }}
                      className={`flex w-full items-center rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-surface-strong ${
                        selectedModel === m.id ? "text-accent" : "text-muted"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate">{m.name}</p>
                        <p className="truncate text-xs text-muted/60">{m.id}</p>
                      </div>
                    </button>
                  ))}
                  {filteredModels.length === 0 && (
                    <p className="px-3 py-2 text-xs text-muted">{t("settings.noModelsFound")}</p>
                  )}
                </div>
              </div>
            )}
          </div>

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
