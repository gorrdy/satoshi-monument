"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useCampaignStats } from "./StatsProvider";

/**
 * Výzva v rámečku formuláře po dosažení cíle (≥ 100 %) — že vybíráme dál
 * (přebytek = poplatky, clo, doprava, instalace, údržba), ať lidé nepřestávají posílat.
 *
 * Testování z konzole prohlížeče:
 *   goalBanner(true)  → vynutí zobrazení bez ohledu na stav sbírky
 *   goalBanner(false) → vrátí zpět (řídí se reálným procentem)
 */
export default function GoalNotice() {
  const t = useTranslations("goalBanner");
  const locale = useLocale();
  const { stats } = useCampaignStats();
  const [forced, setForced] = useState(false);

  useEffect(() => {
    const w = window as unknown as { goalBanner?: (on?: boolean) => void };
    w.goalBanner = (on = true) => setForced(Boolean(on));
    const onShow = () => setForced(true);
    window.addEventListener("goalbanner:show", onShow);
    return () => {
      window.removeEventListener("goalbanner:show", onShow);
      delete w.goalBanner;
    };
  }, []);

  const reached = (stats?.percent ?? 0) >= 100;
  if (!forced && !reached) return null;

  return (
    <div
      role="status"
      className="mb-6 rounded-[var(--radius-sm)] p-3.5 text-sm leading-snug font-medium"
      style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
    >
      {t("text")}{" "}
      <a
        href={`/${locale}/pravidla#vic`}
        className="underline font-bold whitespace-nowrap"
      >
        {t("rulesLink")} →
      </a>
    </div>
  );
}
