"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { formatBtc, formatCzk } from "@/lib/format";
import Reveal from "./Reveal";
import Identicon from "./Identicon";

const TOP_N = 12;

// Top 3 přispěvatelé — zlatá / stříbrná / bronzová.
const MEDALS = ["🥇", "🥈", "🥉"];
const MEDAL_COLOR = ["#f5b50a", "#b8c0c9", "#cd7f32"];

export interface WallEntry {
  id: string;
  name: string;
  currency: string;
  amount: number;
  amountBtc: number | null;
  publicMessage: string | null;
  count?: number;
  createdAt: string;
}

function amountLabel(entry: WallEntry): string {
  if (entry.currency === "CZK") return `${formatCzk(entry.amount)} Kč`;
  if (entry.currency === "MIX")
    return `≈ ${formatBtc(entry.amountBtc ?? entry.amount)} BTC`;
  return `${formatBtc(entry.amount)} BTC`;
}

export default function SupporterWall({
  wall,
  search = false,
}: {
  wall: WallEntry[];
  search?: boolean;
}) {
  const t = useTranslations("wall");
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filtered = q
    ? wall.filter((e) => e.name.toLowerCase().includes(q))
    : wall;
  // Pořadí v plném (seřazeném) seznamu → medaile zůstanou na skutečné top 3 i při hledání.
  const rankById = new Map(wall.map((e, i) => [e.id, i]));
  // Při vyhledávání zobraz vše, co odpovídá; jinak top N (s tlačítkem „více").
  const visible = q || expanded ? filtered : filtered.slice(0, TOP_N);

  return (
    <div className="w-full max-w-6xl mx-auto">
      {search && wall.length > 0 && (
        <div className="max-w-sm mx-auto mb-8">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="ui-input"
          />
        </div>
      )}

      {wall.length === 0 ? (
        <p className="ui-muted py-10 text-center">{t("empty")}</p>
      ) : visible.length === 0 ? (
        <p className="ui-muted py-10 text-center">{t("noMatch")}</p>
      ) : (
        <div className="flex flex-wrap justify-center gap-4">
          {visible.map((entry, i) => {
            const rank = rankById.get(entry.id) ?? 99;
            const medal = rank < 3 ? rank : -1;
            const mColor = medal >= 0 ? MEDAL_COLOR[medal] : null;
            return (
            <Reveal
              key={entry.id}
              delay={(i % 3) * 80}
              className={`ui-card p-5 w-full sm:w-[330px] ${
                medal >= 0 ? "relative overflow-hidden" : ""
              }`}
            >
              {medal >= 0 && (
                <>
                  <span
                    aria-hidden
                    className="absolute left-0 right-0 top-0 h-1"
                    style={{ background: mColor! }}
                  />
                  <span className="absolute top-2.5 right-3 text-4xl leading-none">
                    {MEDALS[medal]}
                  </span>
                </>
              )}
              <div className={`flex items-center gap-3 mb-2 ${medal >= 0 ? "pr-12" : ""}`}>
                <div
                  className="w-10 h-10 shrink-0 overflow-hidden rounded-[var(--radius-sm)] ui-border"
                  style={mColor ? { boxShadow: `0 0 0 2px ${mColor}` } : undefined}
                  title={entry.name}
                >
                  <Identicon seed={entry.id || entry.name} className="w-full h-full" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="ui-display font-bold truncate">{entry.name}</div>
                  <div className="ui-mono text-xs ui-accent font-bold">
                    {amountLabel(entry)}
                    {entry.count && entry.count > 1 ? (
                      <span className="ui-muted font-normal">
                        {" "}· {entry.count}×
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              {entry.publicMessage && (
                <p className="text-sm ui-muted break-words leading-relaxed">
                  “{entry.publicMessage}”
                </p>
              )}
            </Reveal>
            );
          })}
        </div>
      )}

      {!q && wall.length > TOP_N && (
        <div className="flex justify-center mt-10">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="ui-btn press px-5 py-2.5 text-sm"
            aria-expanded={expanded}
          >
            {expanded ? t("showLess") : `${t("showMore")} (${wall.length})`}
            <span
              className={`inline-block transition-transform ${expanded ? "rotate-180" : ""}`}
            >
              ↓
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
