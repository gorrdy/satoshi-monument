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
      <main className="px-4 py-16 sm:py-20">
        <div className="max-w-6xl mx-auto">
          <span className="ui-eyebrow ui-accent">{"// "}Satoshi Monument</span>
          <h1 className="ui-display text-4xl sm:text-5xl font-bold mt-3 mb-4 leading-[1.05]">
            {t("title")}
          </h1>
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
