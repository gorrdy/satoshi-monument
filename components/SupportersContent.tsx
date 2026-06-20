"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import SupporterWall, { type WallEntry } from "./SupporterWall";
import DonationWidget from "./DonationWidget";
import type { Stats } from "./ProgressBar";
import { formatBtc } from "@/lib/format";
import { formatFiat } from "@/lib/fiat";

/**
 * Veřejná stránka Zdi Podporovatelů (průběžná sbírka, kind="supporters").
 * Vlastní fetch /api/supporters (nezávislý na hlavním StatsProvideru).
 */
export default function SupportersContent() {
  const t = useTranslations("supporters");
  const locale = useLocale();
  const [stats, setStats] = useState<Stats | null>(null);
  const [wall, setWall] = useState<WallEntry[]>([]);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/supporters", { cache: "no-store" });
      if (!r.ok) return;
      const d = (await r.json()) as { stats: Stats; wall: WallEntry[] };
      setStats(d.stats);
      setWall(d.wall ?? []);
    } catch {}
  }, []);

  useEffect(() => {
    refresh();
    const iv = setInterval(() => {
      if (!document.hidden) refresh();
    }, 30_000);
    const onR = () => refresh();
    window.addEventListener("supporters:refresh", onR);
    window.addEventListener("focus", onR);
    return () => {
      clearInterval(iv);
      window.removeEventListener("supporters:refresh", onR);
      window.removeEventListener("focus", onR);
    };
  }, [refresh]);

  return (
    <>
      <SiteHeader />
      {/* Teal akcent jen pro tuto stránku — vizuálně odliší Patrony od (oranžové)
          Zdi přispěvatelů, ať se obě sbírky nepletou. Hlavička zůstává oranžová. */}
      <main
        className="px-4 py-16 sm:py-20"
        style={
          {
            "--accent": "#14b8a6",
            "--accent-2": "#2dd4bf",
            "--accent-text": "#5eead4",
            "--accent-fg": "#04231f",
          } as React.CSSProperties
        }
      >
        <div className="max-w-6xl mx-auto">
          <span className="ui-eyebrow ui-accent">{"// "}Satoshi Monument</span>
          <h1 className="ui-display text-4xl sm:text-5xl font-bold mt-3 mb-3 leading-[1.05]">
            {t("title")}
          </h1>
          <span
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full mb-4"
            style={{
              color: "var(--accent-text)",
              background: "color-mix(in srgb, var(--accent) 14%, transparent)",
              border: "1px solid color-mix(in srgb, var(--accent) 35%, transparent)",
            }}
          >
            <svg
              aria-hidden
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 21s-6.7-4.35-9.33-8.07C1.1 10.5 1.5 7.5 3.6 6.1c1.8-1.2 4.1-.7 5.4 1L12 10l3-2.9c1.3-1.7 3.6-2.2 5.4-1 2.1 1.4 2.5 4.4.93 6.83C18.7 16.65 12 21 12 21z" />
            </svg>
            {t("badge")}
          </span>
          <p className="text-lg ui-muted leading-relaxed max-w-2xl">{t("intro")}</p>

          <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1 ui-mono text-sm">
            <span className="ui-accent font-bold text-lg">
              {formatBtc(stats?.raisedBtc ?? 0)} BTC
            </span>
            {stats && (
              <span className="ui-muted">
                ≈ {formatFiat(stats.raisedBtc, stats, locale)} · {stats.donorCount}{" "}
                {t("donors")}
              </span>
            )}
          </div>
          <a
            href={`/${locale}/pravidla-podporovatele`}
            className="ui-eyebrow ui-link inline-block mt-2 underline underline-offset-2"
          >
            {t("rulesLink")} →
          </a>

          {/* Formulář příspěvku — kind=supporters */}
          <div id="donate" className="mt-10 w-full max-w-md mx-auto lg:mx-0">
            <DonationWidget kind="supporters" />
          </div>

          {/* Zeď Podporovatelů */}
          <div className="mt-16">
            <SupporterWall wall={wall} wallKind="supporters" search />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
