"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "@/lib/i18n/client";
import type { TranslationKey } from "@/lib/i18n";

export type SettingsSection = "account" | "reading" | "translation" | "data";

interface Props {
  current: SettingsSection;
}

const SECTIONS: Array<{
  id: SettingsSection;
  label: TranslationKey;
  en: string;
}> = [
  { id: "account", label: "settings.sectionAccount", en: "Account" },
  { id: "reading", label: "settings.sectionReading", en: "Reading" },
  { id: "translation", label: "settings.sectionTranslation", en: "Translation" },
  { id: "data", label: "settings.sectionData", en: "Data & Sync" },
];

export function SidebarNav({ current }: Props) {
  const { t } = useTranslation();
  const searchParams = useSearchParams();

  return (
    <nav
      className="sticky top-5 flex flex-row gap-1 self-start overflow-x-auto md:flex-col md:gap-0 md:overflow-visible"
      aria-label="Settings sections"
    >
      {SECTIONS.map((section) => {
        const active = current === section.id;
        const params = new URLSearchParams(searchParams);
        params.set("section", section.id);
        return (
          <Link
            key={section.id}
            href={`/settings?${params.toString()}`}
            aria-current={active ? "page" : undefined}
            className={`relative flex flex-col gap-0.5 whitespace-nowrap border-b border-border py-2.5 pr-3 transition-colors ${
              active
                ? "text-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            <span
              className={`text-[13px] ${
                active ? "font-semibold text-foreground" : "font-medium"
              }`}
            >
              {t(section.label)}
            </span>
            <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted/80">
              {section.en}
            </span>
            {active ? (
              <span
                aria-hidden
                className="absolute -right-2.5 top-1/2 h-[22px] w-[3px] -translate-y-1/2 rounded-full bg-foreground"
              />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
