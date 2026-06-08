"use client";

import { formatBtc } from "@/lib/format";
import type { RecentPayment } from "./StatsProvider";

/** Plynulý vodorovný ticker posledních příspěvků (s vytrácením na krajích). */
export default function RecentTicker({ recent }: { recent: RecentPayment[] }) {
  if (!recent.length) return null;
  const items = recent.slice(0, 8);
  // Dvakrát za sebou → bezešvá smyčka (animace posune o -50 %).
  const loop = [...items, ...items];

  return (
    <div
      className="relative flex-1 min-w-0 overflow-hidden"
      style={{
        maskImage:
          "linear-gradient(to right, transparent, #000 6%, #000 94%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent, #000 6%, #000 94%, transparent)",
      }}
    >
      <div className="flex gap-2.5 w-max animate-marquee">
        {loop.map((r, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-2 ui-soft ui-border rounded-full pl-2.5 pr-3.5 py-1.5 text-sm whitespace-nowrap"
          >
            <span
              aria-hidden
              className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0"
            />
            <span className="ui-display font-semibold">{r.name}</span>
            <span className="ui-mono ui-accent font-bold">
              {formatBtc(r.amountBtc)} BTC
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
