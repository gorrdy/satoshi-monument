"use client";

import { useTranslations } from "next-intl";
import { formatBtc } from "@/lib/format";
import { useCampaignStats } from "./StatsProvider";

/** Kompaktní stav sbírky do hero (sociální důkaz + cíl). Živá data + reakce na platbu. */
export default function HeroStats() {
  const t = useTranslations("progress");
  const { stats } = useCampaignStats();

  const pct = stats?.percent ?? 0;
  // Po prodloužení cíle (1 → 1,3 BTC) odliš část „nad 1 BTC".
  const goalBtc = stats?.goalBtc ?? 1;
  const goalReached = stats?.goalReached ?? false;
  const threshold = goalReached && goalBtc > 0 ? (1 / goalBtc) * 100 : 100;
  const basePct = Math.min(pct, threshold);
  const overPct = Math.max(0, pct - threshold);
  // Část „nad 1 BTC" střídavým šrafovaným vzorem (accent-2).
  const OVER_BG =
    "repeating-linear-gradient(45deg, var(--accent-2), var(--accent-2) 5px, color-mix(in srgb, var(--accent-2) 60%, #000) 5px, color-mix(in srgb, var(--accent-2) 60%, #000) 10px)";

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
      <div className="relative">
        <div className="relative h-1.5 w-full ui-soft rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 transition-[width] duration-700"
            style={{ width: `${Math.max(2, basePct)}%`, background: "var(--accent)" }}
          />
          {overPct > 0 && (
            <div
              className="absolute inset-y-0 transition-[width] duration-700"
              style={{ left: `${threshold}%`, width: `${overPct}%`, background: OVER_BG }}
              title={t("overLabel")}
            />
          )}
          {goalReached && (
            <div
              aria-hidden
              className="absolute inset-y-0"
              style={{ left: `${threshold}%`, width: "1.5px", background: "rgba(0,0,0,0.5)" }}
            />
          )}
        </div>
        {/* 🏆 na hranici 1 BTC — cíl máme v kapse */}
        {goalReached && (
          <span
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 text-[13px] leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
            style={{ left: `${threshold}%` }}
            title={t("goalPocket")}
          >
            🏆
          </span>
        )}
      </div>
    </div>
  );
}
