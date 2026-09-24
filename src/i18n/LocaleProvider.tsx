"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { NextIntlClientProvider } from "next-intl";
import en from "./en.json";
import am from "./am.json";

export type Locale = "en" | "am";

const MESSAGES: Record<Locale, Record<string, unknown>> = { en, am };
const STORAGE_KEY = "tana_locale";

type LocaleContextType = {
  locale: Locale;
  setLocale: (l: Locale) => void;
};

const LocaleContext = createContext<LocaleContextType>({ locale: "en", setLocale: () => {} });

export function useLocale() {
  return useContext(LocaleContext);
}

function readStoredLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "am" ? "am" : "en";
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLocaleState(readStoredLocale());
    setMounted(true);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
      document.cookie = `${STORAGE_KEY}=${l}; path=/; max-age=31536000`;
      document.documentElement.lang = l === "am" ? "am" : "en";
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      try {
        document.documentElement.lang = locale === "am" ? "am" : "en";
      } catch {
        /* ignore */
      }
    }
  }, [locale, mounted]);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);

  return (
    <LocaleContext.Provider value={value}>
      <NextIntlClientProvider
        locale={locale}
        messages={MESSAGES[locale] as never}
        onError={() => {}}
        getMessageFallback={({ key }) => key.split(".").pop() ?? key}
      >
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}
