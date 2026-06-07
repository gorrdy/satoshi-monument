"use client";

import { useTranslations } from "next-intl";
import { formatBtc } from "@/lib/format";
import { useCampaignStats } from "./StatsProvider";

/** Kompaktní stav sbírky do hero (sociální důkaz + cíl). Živá data + reakce na platbu. */
export default function HeroStats() {
  const t = useTranslations("progress");
  const { stats } = useCampaignStats();

  const pct = stats?.percent ?? 0;

  return (
    <div className="max-w-md">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 ui-mono text-sm mb-2">
        <span className="ui-accent font-bold">
          {formatBtc(stats?.raisedBtc ?? 0)} / {formatBtc(stats?.goalBtc ?? 1)} BTC
        </span>
        <span className="ui-muted">
          · {stats?.donorCount ?? 0} {t("donors")}
        </span>
      </div>
      <div className="h-1.5 w-full ui-soft rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{ width: `${Math.max(2, pct)}%`, background: "var(--accent)" }}
        />
      </div>
    </div>
  );
}
