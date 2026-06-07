"use client";

import { useLocaleSwitch } from "./I18nProvider";

const LOCALES = ["cs", "en"] as const;

export default function LocaleSwitcher() {
  const { locale, switchLocale } = useLocaleSwitch();

  return (
    <div className="flex items-center ui-border overflow-hidden rounded-[var(--radius-sm)]">
      {LOCALES.map((loc) => (
        <button
          key={loc}
          onClick={() => switchLocale(loc)}
          className={`px-2.5 py-1 ui-mono text-xs uppercase transition-colors ${
            loc === locale
              ? "bg-[var(--accent)] text-[var(--accent-fg)] font-semibold"
              : "ui-link"
          }`}
          aria-current={loc === locale}
        >
          {loc}
        </button>
      ))}
    </div>
  );
}
