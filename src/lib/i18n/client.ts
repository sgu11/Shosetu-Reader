"use client";

import { createContext, useCallback, useContext } from "react";
import { dictionaries, type Locale, type TranslationKey } from "./dictionaries";

export type { Locale, TranslationKey };

export const LocaleContext = createContext<Locale>("ko");

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useTranslation() {
  const locale = useLocale();

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>): string => {
      let text: string = dictionaries[locale][key] ?? dictionaries.en[key] ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          text = text.replace(`{${k}}`, String(v));
        }
      }
      return text;
    },
    [locale],
  );

  return { t, locale };
}
