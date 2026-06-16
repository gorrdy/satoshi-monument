"use client";

import { useLocale, useTranslations } from "next-intl";
import { formatBtc } from "@/lib/format";
import { formatFiat } from "@/lib/fiat";
import CountUp from "./CountUp";

export interface Stats {
  goalBtc: number;
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
        <div
          className="absolute inset-y-0 left-0 transition-[width] duration-1000 ease-out"
          style={{ width: `${Math.max(2, percent)}%`, background: "var(--accent)" }}
        />
      </div>

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
