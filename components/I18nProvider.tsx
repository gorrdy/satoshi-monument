"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { NextIntlClientProvider } from "next-intl";
import cs from "@/messages/cs.json";
import en from "@/messages/en.json";

type Locale = "cs" | "en";
const MESSAGES: Record<Locale, typeof cs> = { cs, en };

interface Ctx {
  locale: Locale;
  switchLocale: (l: Locale) => void;
}
const LocaleCtx = createContext<Ctx>({ locale: "cs", switchLocale: () => {} });

export const useLocaleSwitch = () => useContext(LocaleCtx);

export default function I18nProvider({
  initialLocale,
  children,
}: {
  initialLocale: string;
  children: React.ReactNode;
}) {
  const [locale, setLocale] = useState<Locale>(
    initialLocale === "en" ? "en" : "cs",
  );

  const switchLocale = useCallback((l: Locale) => {
    setLocale(l);
    if (typeof document !== "undefined") {
      document.documentElement.lang = l;
      // Aktualizace URL bez navigace (jen přepíšeme prefix /cs|/en) — nepřenačítá stránku.
      const { pathname, search, hash } = window.location;
      const next = pathname.replace(/^\/(cs|en)(?=\/|$)/, "/" + l);
      window.history.replaceState(null, "", next + search + hash);
      try {
        document.title = MESSAGES[l].meta.title;
      } catch {}
    }
  }, []);

  return (
    <LocaleCtx.Provider value={{ locale, switchLocale }}>
      <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]}>
        {children}
      </NextIntlClientProvider>
    </LocaleCtx.Provider>
  );
}
