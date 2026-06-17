"use client";

import { useLocale, useTranslations } from "next-intl";
import { formatBtc } from "@/lib/format";
import { formatFiat } from "@/lib/fiat";
import CountUp from "./CountUp";

export interface Stats {
  goalBtc: number;
  goalReached: boolean;
  raisedBtc: number;
  percent: number;
  donorCount: number;
  btcCzkRate: number;
  btcUsdRate: number;
  raisedCzk: number;
  raisedUsd: number;
}

export default function ProgressBar({ stats }: { stats: Stats | null }) {
  const t = useTranslations("progress");
  const locale = useLocale();

  const percent = stats?.percent ?? 0;
  const raisedBtc = stats?.raisedBtc ?? 0;
  const goalBtc = stats?.goalBtc ?? 1;

  // Po prodloužení cíle (1 → 1,3 BTC) vizuálně oddělíme část „nad 1 BTC".
  const goalReached = stats?.goalReached ?? false;
  const threshold = goalReached && goalBtc > 0 ? (1 / goalBtc) * 100 : 100; // poloha 1 BTC na lajně
  const basePct = Math.min(percent, threshold);
  const overPct = Math.max(0, percent - threshold);
  // Část „nad 1 BTC" střídavým šrafovaným vzorem (accent-2) — odliší i v tématu, kde accent==accent-2.
  const OVER_BG =
    "repeating-linear-gradient(45deg, var(--accent-2), var(--accent-2) 7px, color-mix(in srgb, var(--accent-2) 60%, #000) 7px, color-mix(in srgb, var(--accent-2) 60%, #000) 14px)";

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
        <div>
          <div className="ui-eyebrow ui-muted mb-1">{t("raised")}</div>
          <div className="ui-mono text-4xl sm:text-6xl font-bold leading-none ui-accent">
            <CountUp value={raisedBtc} decimals={raisedBtc < 1 ? 5 : 4} />
            <span className="text-2xl sm:text-3xl ml-2">BTC</span>
          </div>
          {stats && (
            <div className="text-sm ui-muted mt-2 ui-mono">
              {t("approxFiat", { amount: formatFiat(raisedBtc, stats, locale) })}
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="ui-eyebrow ui-muted mb-1">{t("goal")}</div>
          <div className="ui-mono text-2xl font-bold">{formatBtc(goalBtc)} BTC</div>
        </div>
      </div>

      <div className="relative h-8 w-full ui-border ui-soft overflow-hidden rounded-[var(--radius-sm)]">
        {/* základ: 0 → 1 BTC */}
        <div
          className="absolute inset-y-0 left-0 transition-[width] duration-1000 ease-out"
          style={{ width: `${Math.max(2, basePct)}%`, background: "var(--accent)" }}
        />
        {/* nad 1 BTC (šrafovaně, na náklady) */}
        {overPct > 0 && (
          <div
            className="absolute inset-y-0 transition-[width] duration-1000 ease-out"
            style={{ left: `${threshold}%`, width: `${overPct}%`, background: OVER_BG }}
            title={t("overLabel")}
          />
        )}
        {/* značka hranice 1 BTC */}
        {goalReached && (
          <div
            aria-hidden
            className="absolute inset-y-0"
            style={{ left: `${threshold}%`, width: "2px", background: "rgba(0,0,0,0.5)" }}
          />
        )}
      </div>
      {goalReached && (
        <div className="flex items-center gap-4 mt-2 ui-mono text-[11px] ui-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ background: "var(--accent)" }} />
            {t("baseLabel")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ background: OVER_BG }} />
            {t("overLabel")}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between mt-3 ui-mono text-sm">
        <span className="font-bold ui-accent">
          <CountUp value={percent} decimals={1} /> %
        </span>
        <span className="ui-muted uppercase tracking-wider text-xs">
          <CountUp value={stats?.donorCount ?? 0} /> {t("donors")}
        </span>
      </div>
    </div>
  );
}
