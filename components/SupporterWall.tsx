"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatBtc, formatCzk } from "@/lib/format";
import Reveal from "./Reveal";
import Identicon from "./Identicon";

const TOP_N = 12;

// Top 3 přispěvatelé — zlatá / stříbrná / bronzová.
const MEDALS = ["🥇", "🥈", "🥉"];
const MEDAL_COLOR = ["#f5b50a", "#b8c0c9", "#cd7f32"];

export interface WallItem {
  amount: number;
  currency: string;
  amountBtc: number;
  publicMessage: string | null;
  createdAt: string;
}

export interface WallEntry {
  id: string;
  name: string;
  currency: string;
  amount: number;
  amountBtc: number | null;
  publicMessage: string | null;
  count?: number;
  createdAt: string;
  imageUrl?: string | null;
  imageBg?: string | null;
  items?: WallItem[];
}

/** Avatar přispěvatele: vlastní obrázek (logo), jinak generativní identicon. */
function Avatar({ entry }: { entry: WallEntry }) {
  if (entry.imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={entry.imageUrl}
        alt={entry.name}
        className="w-full h-full object-contain"
        style={{ background: entry.imageBg || "#ffffff" }}
      />
    );
  }
  return (
    <Identicon seed={entry.id || entry.name} name={entry.name} className="w-full h-full" />
  );
}

// Vše v BTC — ekvivalent zafixovaný v okamžiku přijetí platby.
function amountLabel(entry: WallEntry): string {
  return `${formatBtc(entry.amountBtc ?? entry.amount)} BTC`;
}


export default function SupporterWall({
  wall,
  search = false,
}: {
  wall: WallEntry[];
  search?: boolean;
}) {
  const t = useTranslations("wall");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<WallEntry | null>(null);

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === "en" ? "en-US" : "cs-CZ", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    });

  // ESC zavírá detail.
  useEffect(() => {
    if (!detail) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDetail(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [detail]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? wall.filter((e) => e.name.toLowerCase().includes(q))
    : wall;
  // Pořadí v plném (seřazeném) seznamu → medaile zůstanou na skutečné top 3 i při hledání.
  const rankById = new Map(wall.map((e, i) => [e.id, i]));

  // Karta přispěvatele (sdílená pro stupně vítězů i mřížku).
  const renderCard = (entry: WallEntry, delay: number, widthClass: string) => {
    const rank = rankById.get(entry.id) ?? 99;
    const medal = rank < 3 ? rank : -1;
    const mColor = medal >= 0 ? MEDAL_COLOR[medal] : null;
    const multi = (entry.count ?? 1) > 1 && (entry.items?.length ?? 0) > 1;
    return (
      <Reveal
        key={entry.id}
        delay={delay}
        className={`ui-card p-5 ${widthClass} flex flex-col ${
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
            <Avatar entry={entry} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="ui-display font-bold truncate">{entry.name}</div>
            <div className="ui-mono text-xs ui-accent font-bold">
              {amountLabel(entry)}
              {entry.count && entry.count > 1 ? (
                <span className="ui-muted font-normal"> · {entry.count}×</span>
              ) : null}
            </div>
          </div>
        </div>
        {entry.publicMessage && (
          <p className="text-sm ui-muted break-words leading-relaxed">
            “{entry.publicMessage}”
          </p>
        )}
        {multi && (
          <button
            onClick={() => setDetail(entry)}
            className="ui-link ui-eyebrow text-left mt-3 self-start"
          >
            {t("showAll")} ({entry.count}) →
          </button>
        )}
      </Reveal>
    );
  };

  // Stupně vítězů jen ve výchozím pohledu (ne při hledání) a když je aspoň 3 přispěvatelé.
  const showPodium = !q && wall.length >= 3;
  const top3 = showPodium ? wall.slice(0, 3) : [];
  const gridList = q
    ? filtered
    : showPodium
      ? expanded
        ? wall.slice(3)
        : wall.slice(3, TOP_N)
      : expanded
        ? wall
        : wall.slice(0, TOP_N);

  // pořadí na stupních: vlevo 2., uprostřed 1. (nejvyšší), vpravo 3. — i na mobilu.
  const PODIUM_ORDER = ["order-2", "order-1", "order-3"];
  // výška stupínku podle umístění (1. nejvyšší) — i na mobilu.
  const PODIUM_H = ["h-20 sm:h-28", "h-14 sm:h-20", "h-10 sm:h-14"];

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
      ) : q && filtered.length === 0 ? (
        <p className="ui-muted py-10 text-center">{t("noMatch")}</p>
      ) : (
        <>
          {/* Stupně vítězů (top 3) — vodorovné stupínky i na mobilu */}
          {showPodium && (
            <div className="flex flex-row items-end justify-center gap-2 sm:gap-4 mb-12">
              {top3.map((entry, place) => {
                const multi =
                  (entry.count ?? 1) > 1 && (entry.items?.length ?? 0) > 1;
                return (
                  <div
                    key={entry.id}
                    className={`flex-1 min-w-0 max-w-[200px] sm:max-w-[290px] flex flex-col ${PODIUM_ORDER[place]}`}
                  >
                    {/* Kompaktní karta: medaile, avatar nahoře, jméno, částka */}
                    <div className="ui-card relative overflow-hidden p-2.5 sm:p-4 flex flex-col items-center text-center">
                      <span
                        aria-hidden
                        className="absolute left-0 right-0 top-0 h-1"
                        style={{ background: MEDAL_COLOR[place] }}
                      />
                      <span className="text-2xl sm:text-4xl leading-none mt-1">
                        {MEDALS[place]}
                      </span>
                      <div
                        className="w-12 h-12 sm:w-16 sm:h-16 mt-2 overflow-hidden rounded-[var(--radius-sm)] ui-border"
                        style={{ boxShadow: `0 0 0 2px ${MEDAL_COLOR[place]}` }}
                        title={entry.name}
                      >
                        <Avatar entry={entry} />
                      </div>
                      <div className="ui-display font-bold text-sm sm:text-base truncate w-full mt-2">
                        {entry.name}
                      </div>
                      <div className="ui-mono text-[11px] sm:text-xs ui-accent font-bold break-all">
                        {amountLabel(entry)}
                      </div>
                      {multi && (
                        <button
                          onClick={() => setDetail(entry)}
                          className="ui-link ui-eyebrow text-[10px] sm:text-xs mt-1"
                        >
                          {entry.count}× →
                        </button>
                      )}
                    </div>
                    {/* Stupínek */}
                    <div
                      className={`mt-2 ${PODIUM_H[place]} rounded-b-[var(--radius-sm)] ui-border border-t-0 flex items-center justify-center`}
                      style={{ background: MEDAL_COLOR[place] }}
                      aria-hidden
                    >
                      <span
                        className="ui-display font-black text-2xl sm:text-3xl"
                        style={{ color: "rgba(0,0,0,0.55)" }}
                      >
                        {place + 1}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Zbytek (mřížka) */}
          {gridList.length > 0 && (
            <div className="flex flex-wrap justify-center gap-4">
              {gridList.map((entry, i) =>
                renderCard(entry, (i % 3) * 80, "w-full sm:w-[330px]"),
              )}
            </div>
          )}
        </>
      )}

      {!q && wall.length > TOP_N && (
        <div className="flex justify-center mt-10">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="ui-btn press px-5 py-2.5 text-sm"
            aria-expanded={expanded}
          >
            {expanded ? t("showLess") : `${t("showMore")} (${wall.length - TOP_N})`}
            <span
              className={`inline-block transition-transform ${expanded ? "rotate-180" : ""}`}
            >
              ↓
            </span>
          </button>
        </div>
      )}

      {/* Pop-up: všechny příspěvky daného přispěvatele */}
      {detail && (
        <div
          className="fixed inset-0 z-[80] overflow-y-auto bg-black/80 backdrop-blur-sm"
          onClick={() => setDetail(null)}
        >
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-label={detail.name}
              className="relative w-full max-w-md ui-card p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setDetail(null)}
                aria-label={tc("close")}
                className="press absolute top-3 right-3 w-8 h-8 ui-border flex items-center justify-center rounded-[var(--radius-sm)]"
              >
                ✕
              </button>

              <div className="flex items-center gap-3 mb-1 pr-8">
                <div className="w-10 h-10 shrink-0 overflow-hidden rounded-[var(--radius-sm)] ui-border">
                  <Avatar entry={detail} />
                </div>
                <div className="min-w-0">
                  <div className="ui-display font-bold truncate">{detail.name}</div>
                  <div className="ui-mono text-xs ui-accent font-bold">
                    {amountLabel(detail)}
                    <span className="ui-muted font-normal"> · {detail.count}×</span>
                  </div>
                </div>
              </div>

              <h3 className="ui-eyebrow ui-muted mt-4 mb-3">
                {t("allContributions")}
              </h3>
              <ul className="space-y-3 max-h-[55vh] overflow-y-auto">
                {(detail.items ?? []).map((it, idx) => (
                  <li key={idx} className="ui-soft ui-border rounded-[var(--radius-sm)] p-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="ui-mono font-bold ui-accent">
                        {formatBtc(it.amountBtc)} BTC
                        {it.currency === "CZK" && (
                          <span className="ui-muted font-normal">
                            {" "}· {formatCzk(it.amount)} Kč
                          </span>
                        )}
                      </span>
                      <span className="text-xs ui-muted">{fmtDate(it.createdAt)}</span>
                    </div>
                    {it.publicMessage && (
                      <p className="text-sm ui-muted break-words leading-relaxed mt-1.5">
                        “{it.publicMessage}”
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
