"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCampaignStats } from "./StatsProvider";
import Identicon from "./Identicon";
import { formatSats, formatCzk } from "@/lib/format";

/** Lokalizovaný relativní čas: „před 5 min" / „5 min ago". */
function timeAgo(iso: string, locale: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale === "en" ? "en" : "cs", {
    numeric: "auto",
  });
  if (diff < 60) return rtf.format(-Math.round(diff), "second");
  if (diff < 3600) return rtf.format(-Math.round(diff / 60), "minute");
  if (diff < 86400) return rtf.format(-Math.round(diff / 3600), "hour");
  return rtf.format(-Math.round(diff / 86400), "day");
}

function amountLabel(d: { currency: string; amount: number; amountBtc: number }) {
  if (d.currency === "CZK") return `${formatCzk(d.amount)} Kč`;
  return `${formatSats(d.amountBtc || d.amount)} sats`;
}

/**
 * Živý feed posledních příspěvků (čerpá ze StatsProvideru → aktualizuje se à 30 s,
 * nárůst spustí konfety jinde). Starší položky postupně ztrácejí krytí.
 */
export default function RecentDonations() {
  const t = useTranslations("recent");
  const locale = useLocale();
  const { recent, pending } = useCampaignStats();

  if ((!recent || recent.length === 0) && (!pending || pending.length === 0))
    return null;

  const n = recent.length;

  return (
    <div className="mt-7">
      <h2 className="ui-eyebrow ui-muted mb-3">{t("title")}</h2>
      <ul className="space-y-2 max-w-md">
        {/* Probíhající platby — bez reálných dat, jen rozmazaný placeholder */}
        {pending.map((p) => (
          <li key={p.id} className="animate-rise flex items-center gap-3">
            <div className="w-8 h-8 shrink-0 rounded-[var(--radius-sm)] ui-border ui-soft animate-pulse" />
            <div className="min-w-0 flex-1 flex items-center gap-2">
              <span
                aria-hidden
                className="inline-block h-3 w-24 rounded bg-[var(--muted)]/40 blur-[3px] animate-pulse select-none"
              />
              <span
                aria-hidden
                className="inline-block h-3 w-12 rounded bg-[var(--accent)]/40 blur-[3px] animate-pulse select-none"
              />
            </div>
            <span className="text-xs ui-accent shrink-0 inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
              {t("inProgress")}
            </span>
          </li>
        ))}
        {recent.map((d, i) => {
          // 1. položka plné krytí, poslední ~10 % — lineárně mezi.
          const opacity = n > 1 ? 1 - (i / (n - 1)) * 0.9 : 1;
          return (
            <li
              key={d.id}
              className="animate-rise flex items-center gap-3"
              style={{ opacity }}
            >
              <div className="w-8 h-8 shrink-0 overflow-hidden rounded-[var(--radius-sm)] ui-border">
                {d.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={d.imageUrl}
                    alt={d.name}
                    className="w-full h-full object-contain p-0.5"
                    style={{ background: d.imageBg || "#ffffff" }}
                  />
                ) : (
                  <Identicon seed={d.name} name={d.name} className="w-full h-full" />
                )}
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <span className="ui-display font-bold truncate">{d.name}</span>
                <span className="ui-mono text-xs ui-accent font-bold ml-2">
                  {amountLabel(d)}
                </span>
                <span
                  className={`ml-1.5 align-middle inline-block px-1.5 py-px rounded-[var(--radius-sm)] text-[10px] font-bold ${
                    d.currency === "BTC"
                      ? "ui-accent-box"
                      : "ui-border ui-muted"
                  }`}
                >
                  {d.currency}
                </span>
              </div>
              <span className="text-xs ui-muted shrink-0">
                {timeAgo(d.createdAt, locale)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
