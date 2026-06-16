"use client";

import { useCallback, useEffect, useState } from "react";

interface Analytics {
  days: number;
  humanViews: number;
  botViews: number;
  uniqueVisitors: number;
  perDay: { day: string; views: number; bots: number }[];
  donationsPerDay: { day: string; count: number; sats: number }[];
  topReferrers: { referrer: string; count: number }[];
  device: Record<string, number>;
  locale: Record<string, number>;
  funnel: { visitors: number; created: number; confirmed: number };
}

const RANGES = [7, 30, 90];

function pct(part: number, whole: number): string {
  if (!whole) return "0 %";
  return ((part / whole) * 100).toFixed(1) + " %";
}

function fmtSats(s: number): string {
  if (s >= 1_000_000) return (s / 1_000_000).toFixed(s >= 10_000_000 ? 0 : 1) + "M";
  if (s >= 1_000) return Math.round(s / 1_000) + "k";
  return String(s);
}

export default function AdminAnalytics() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (d: number) => {
    setLoading(true);
    const res = await fetch(`/api/admin/analytics?days=${d}`, {
      cache: "no-store",
    });
    if (res.ok) setData((await res.json()) as Analytics);
    setLoading(false);
  }, []);

  useEffect(() => {
    load(days);
  }, [days, load]);

  const maxDay = Math.max(1, ...(data?.perDay.map((p) => p.views) ?? [1]));
  const maxRef = Math.max(1, ...(data?.topReferrers.map((r) => r.count) ?? [1]));

  // Dvouosý graf příspěvků: sloupce = počet (levá osa), čára = objem v sats (pravá osa).
  const dpd = data?.donationsPerDay ?? [];
  const maxCount = Math.max(1, ...dpd.map((p) => p.count));
  const maxSats = Math.max(1, ...dpd.map((p) => p.sats));
  const volPoints = dpd
    .map((p, i) => {
      const x = dpd.length > 1 ? (i / (dpd.length - 1)) * 100 : 50;
      const y = 100 - (p.sats / maxSats) * 100;
      return `${x},${y}`;
    })
    .join(" ");
  const totalCount = dpd.reduce((s, p) => s + p.count, 0);
  const totalSats = dpd.reduce((s, p) => s + p.sats, 0);

  const Kpi = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
    <div className="rounded-xl bg-white/5 border border-white/10 p-4">
      <div className="text-xs uppercase tracking-wider text-white/50">{label}</div>
      <div className="text-2xl font-bold font-mono mt-1">{value}</div>
      {hint && <div className="text-xs text-white/40 mt-0.5">{hint}</div>}
    </div>
  );

  const Split = ({ title, map }: { title: string; map: Record<string, number> }) => {
    const total = Object.values(map).reduce((s, n) => s + n, 0);
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
    return (
      <div className="rounded-xl bg-white/5 border border-white/10 p-4">
        <div className="text-xs uppercase tracking-wider text-white/50 mb-3">{title}</div>
        <div className="space-y-2">
          {entries.length === 0 && <div className="text-sm text-white/40">—</div>}
          {entries.map(([k, v]) => (
            <div key={k}>
              <div className="flex justify-between text-sm mb-0.5">
                <span className="capitalize">{k}</span>
                <span className="font-mono text-white/60">
                  {v} · {pct(v, total)}
                </span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full"
                  style={{ width: `${total ? (v / total) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setDays(r)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              days === r
                ? "bg-accent text-black font-semibold"
                : "bg-white/5 text-white/60 hover:text-white"
            }`}
          >
            {r} dní
          </button>
        ))}
      </div>

      {loading && !data ? (
        <p className="text-white/40 py-8 text-center">Načítám…</p>
      ) : !data ? (
        <p className="text-white/40 py-8 text-center">Žádná data.</p>
      ) : (
        <div className="space-y-6">
          {/* KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi label="Návštěvy (lidé)" value={data.humanViews.toLocaleString("cs-CZ")} />
            <Kpi label="Unikátní návštěvníci" value={data.uniqueVisitors.toLocaleString("cs-CZ")} />
            <Kpi label="Boti / crawleři" value={data.botViews.toLocaleString("cs-CZ")} hint="nepočítají se do návštěv" />
            <Kpi
              label="Konverze"
              value={pct(data.funnel.created, data.uniqueVisitors)}
              hint="dary / unik. návštěvníci"
            />
          </div>

          {/* Graf po dnech */}
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <div className="text-xs uppercase tracking-wider text-white/50 mb-3">
              Návštěvy po dnech (lidé)
            </div>
            <div className="flex items-end gap-[2px] h-32">
              {data.perDay.map((p) => (
                <div
                  key={p.day}
                  className="flex-1 bg-accent/80 hover:bg-accent rounded-t transition-colors"
                  style={{ height: `${Math.max(2, (p.views / maxDay) * 100)}%` }}
                  title={`${p.day}: ${p.views} návštěv${p.bots ? ` (+${p.bots} botů)` : ""}`}
                />
              ))}
            </div>
          </div>

          {/* Příspěvky po dnech — dvouosý: počet (sloupce) + objem v sats (čára) */}
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs uppercase tracking-wider text-white/50">
                Příspěvky po dnech
              </div>
              <div className="flex items-center gap-3 text-[11px] text-white/50">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-white/30" /> počet
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-3 h-[2px] bg-accent" /> objem (sats)
                </span>
              </div>
            </div>
            <div className="relative h-40">
              <div className="absolute left-0 -top-0.5 text-[10px] text-white/40">
                {maxCount}
              </div>
              <div className="absolute right-0 -top-0.5 text-[10px] text-accent">
                {fmtSats(maxSats)}
              </div>
              {/* sloupce: počet */}
              <div className="absolute inset-0 flex items-end gap-[2px]">
                {dpd.map((p) => (
                  <div
                    key={p.day}
                    className="flex-1 bg-white/25 hover:bg-white/40 rounded-t transition-colors"
                    style={{ height: `${p.count ? Math.max(2, (p.count / maxCount) * 100) : 0}%` }}
                    title={`${p.day}: ${p.count} příspěvků · ${fmtSats(p.sats)} sats`}
                  />
                ))}
              </div>
              {/* čára: objem */}
              <svg
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden
              >
                <polyline
                  points={volPoints}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>
            <div className="flex justify-between text-[10px] text-white/40 mt-1">
              <span>{dpd[0]?.day}</span>
              <span>{dpd[dpd.length - 1]?.day}</span>
            </div>
            <div className="text-[11px] text-white/50 mt-2">
              Za období: <strong>{totalCount}</strong> příspěvků ·{" "}
              <strong>{fmtSats(totalSats)}</strong> sats
            </div>
          </div>

          {/* Funnel */}
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <div className="text-xs uppercase tracking-wider text-white/50 mb-3">
              Konverzní trychtýř
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <div className="rounded-lg bg-white/5 px-4 py-3">
                <div className="text-white/50 text-xs">Unik. návštěvníci</div>
                <div className="text-xl font-bold font-mono">{data.funnel.visitors}</div>
              </div>
              <span className="text-white/30">→</span>
              <div className="rounded-lg bg-white/5 px-4 py-3">
                <div className="text-white/50 text-xs">Vytvořené dary</div>
                <div className="text-xl font-bold font-mono">{data.funnel.created}</div>
                <div className="text-xs text-accent">{pct(data.funnel.created, data.funnel.visitors)}</div>
              </div>
              <span className="text-white/30">→</span>
              <div className="rounded-lg bg-white/5 px-4 py-3">
                <div className="text-white/50 text-xs">Potvrzené dary</div>
                <div className="text-xl font-bold font-mono">{data.funnel.confirmed}</div>
                <div className="text-xs text-accent">{pct(data.funnel.confirmed, data.funnel.created)}</div>
              </div>
            </div>
          </div>

          {/* Zdroje + zařízení + jazyk */}
          <div className="grid md:grid-cols-3 gap-3">
            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <div className="text-xs uppercase tracking-wider text-white/50 mb-3">Top zdroje</div>
              <div className="space-y-2">
                {data.topReferrers.length === 0 && <div className="text-sm text-white/40">—</div>}
                {data.topReferrers.map((r) => (
                  <div key={r.referrer}>
                    <div className="flex justify-between text-sm mb-0.5">
                      <span className="truncate">{r.referrer === "direct" ? "přímo" : r.referrer}</span>
                      <span className="font-mono text-white/60">{r.count}</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full" style={{ width: `${(r.count / maxRef) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <Split title="Zařízení" map={data.device} />
            <Split title="Jazyk" map={data.locale} />
          </div>
        </div>
      )}
    </div>
  );
}
