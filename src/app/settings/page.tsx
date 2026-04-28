"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Eyebrow } from "@/components/eyebrow";
import { ModelPicker } from "@/components/model-picker";
import { FontStackPicker } from "@/components/settings/font-stack-picker";
import { ReaderStepperTrio } from "@/components/settings/reader-stepper-trio";
import { SettingRow } from "@/components/settings/setting-row";
import { SidebarNav, type SettingsSection } from "@/components/settings/sidebar-nav";
import { ThemePicker } from "@/components/settings/theme-picker";
import { useTranslation } from "@/lib/i18n/client";

const VALID_SECTIONS: ReadonlyArray<SettingsSection> = [
  "account",
  "reading",
  "translation",
  "data",
];

export default function SettingsPage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const requested = searchParams.get("section") as SettingsSection | null;
  const section: SettingsSection =
    requested && VALID_SECTIONS.includes(requested) ? requested : "reading";

  const [modelName, setModelName] = useState("");
  const [globalPrompt, setGlobalPrompt] = useState("");
  const [defaultGlobalPrompt, setDefaultGlobalPrompt] = useState("");
  const [favoriteModels, setFavoriteModels] = useState<string[]>([]);
  const [adultContentEnabled, setAdultContentEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/translation-settings")
      .then((res) => res.json())
      .then((data) => {
        setModelName(data.modelName ?? "");
        setGlobalPrompt(data.globalPrompt ?? "");
        setDefaultGlobalPrompt(data.defaultGlobalPrompt ?? "");
        setFavoriteModels(Array.isArray(data.favoriteModels) ? data.favoriteModels : []);
      })
      .catch(() => {});
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.adultContentEnabled === "boolean") {
          setAdultContentEnabled(data.adultContentEnabled);
        }
      })
      .catch(() => {});
  }, []);

  const toggleAdult = useCallback((next: boolean) => {
    setAdultContentEnabled(next);
    fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adultContentEnabled: next }),
    }).catch(() => {});
  }, []);

  const saveSettings = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/translation-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelName, globalPrompt, favoriteModels }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }, [modelName, globalPrompt, favoriteModels]);

  const toggleFavorite = useCallback((m: string) => {
    setFavoriteModels((prev) => {
      const next = prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m];
      fetch("/api/translation-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favoriteModels: next }),
      }).catch(() => {});
      return next;
    });
  }, []);

  function applyDefaultPrompt() {
    setGlobalPrompt(defaultGlobalPrompt);
  }

  return (
    <main className="frame-paper paper-grain flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-14 py-10">
        <header>
          <Eyebrow>{t("settings.eyebrow")}</Eyebrow>
          <h1 className="mt-2 mb-0 font-serif text-5xl font-normal tracking-tight text-foreground md:text-6xl">
            <span className="italic">{t("settings.heading")}</span>{" "}
            {t("settings.headingFlair")}
          </h1>
        </header>

        <div className="grid gap-10 md:grid-cols-[200px_1fr] md:gap-14">
          <SidebarNav current={section} />

          <div className="min-w-0">
            {section === "account" ? (
              <SettingRow
                label={t("settings.sectionAccount")}
                hint={t("settings.profilesHint")}
              >
                <Link href="/profiles" className="btn-pill btn-secondary text-[12px]">
                  {t("settings.profilesAction")}
                </Link>
              </SettingRow>
            ) : null}

            {section === "reading" ? (
              <>
                <SettingRow
                  label={t("settings.themeSection")}
                  hint={t("settings.themeSectionDesc")}
                >
                  <ThemePicker />
                </SettingRow>
                <SettingRow
                  label={t("settings.readerSettings")}
                  hint={t("settings.readerSettingsDesc")}
                >
                  <ReaderStepperTrio />
                </SettingRow>
                <SettingRow
                  label={t("settings.fontFamily")}
                  hint={t("settings.fontFamilyDesc")}
                >
                  <FontStackPicker />
                </SettingRow>
                <SettingRow
                  label={t("settings.adultContent")}
                  hint={t("settings.adultContentDesc")}
                >
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={adultContentEnabled}
                      onChange={(e) => toggleAdult(e.target.checked)}
                      className="h-4 w-4 accent-accent"
                    />
                    {adultContentEnabled
                      ? t("settings.adultContentOn")
                      : t("settings.adultContentOff")}
                  </label>
                </SettingRow>
              </>
            ) : null}

            {section === "translation" ? (
              <>
                <SettingRow
                  label={t("settings.translationModel")}
                  hint={t("settings.translationModelDesc")}
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-foreground">
                        {t("settings.currentModel")}:
                      </span>
                      <span className="code-label">{modelName || "—"}</span>
                    </div>
                    <ModelPicker
                      value={modelName}
                      onChange={setModelName}
                      favorites={favoriteModels}
                      onToggleFavorite={toggleFavorite}
                      placeholder={t("settings.searchModels")}
                    />
                  </div>
                </SettingRow>

                <SettingRow
                  label={t("settings.globalPrompt")}
                  hint={t("settings.globalPromptDesc")}
                >
                  <div className="space-y-3">
                    <textarea
                      value={globalPrompt}
                      onChange={(e) => setGlobalPrompt(e.target.value)}
                      rows={12}
                      className="w-full rounded-md border border-border bg-surface px-4 py-3 text-sm leading-relaxed text-foreground placeholder:text-muted/50 focus:border-border-strong focus:outline-none"
                      placeholder={t("settings.globalPromptPlaceholder")}
                    />
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={saveSettings}
                        disabled={saving}
                        className="btn-pill btn-accent min-w-[5rem]"
                      >
                        {saving ? "…" : t("settings.save")}
                      </button>
                      <button
                        type="button"
                        onClick={applyDefaultPrompt}
                        className="btn-pill btn-secondary text-xs"
                      >
                        {t("settings.useDefault")}
                      </button>
                      <span
                        className={`text-sm text-accent transition-opacity ${
                          saved ? "opacity-100" : "opacity-0"
                        }`}
                      >
                        {t("settings.saved")}
                      </span>
                    </div>
                  </div>
                </SettingRow>
              </>
            ) : null}

            {section === "data" ? (
              <SettingRow label={t("settings.sectionData")} hint="—">
                <p className="text-xs text-muted">—</p>
              </SettingRow>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
