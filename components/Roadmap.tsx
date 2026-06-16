"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Reveal from "./Reveal";

interface Item {
  id: string;
  title: string;
  detail: string | null;
  dateLabel: string | null;
  status: string; // done | current | upcoming
  linkUrl: string | null;
}

export default function Roadmap() {
  const t = useTranslations("roadmap");
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    fetch("/api/roadmap")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setItems(d?.items ?? []))
      .catch(() => {});
  }, []);

  if (items.length === 0) return null;

  // Index bodu se stavem „current" (nebo -1).
  const currentStatusIndex = items.findIndex((x) => x.status === "current");
  // Index posledního „done" (nebo -1).
  let lastDoneIndex = -1;
  items.forEach((x, i) => {
    if (x.status === "done") lastDoneIndex = i;
  });

  return (
    <section id="roadmap" className="px-4 py-20 sm:py-24 ui-border-b">
      <Reveal className="max-w-2xl mx-auto text-center mb-10">
        <span className="ui-eyebrow ui-accent">{t("eyebrow")}</span>
        <h2 className="ui-display text-4xl sm:text-5xl mt-3 leading-[1.0]">
          {t("title")}
        </h2>
        <p className="ui-muted mt-2">{t("subtitle")}</p>
      </Reveal>

      {/* Vodorovná timeline; na mobilu se vodorovně scrolluje */}
      <div className="overflow-x-auto pb-2 -mx-4 px-4">
        <ol className="flex min-w-max sm:min-w-0 sm:max-w-5xl mx-auto">
          {items.map((it, i) => {
            const done = it.status === "done";
            const current = it.status === "current";
            const isFirst = i === 0;
            const isLast = i === items.length - 1;
            // Current marker je „mezi" předchozím a tímto bodem (na levém okraji slotu),
            // pokud existuje předchozí bod. Když je current první, sedí v centru.
            const currentBetween = current && i > 0;
            // Oranžová čára končí u markeru:
            //  - když existuje current: orange jen pro segmenty PŘED ním (i < current),
            //    takže končí na levém okraji current slotu (= u markeru).
            //  - jinak končí u posledního done bodu (jeho středu).
            const fillRef = currentStatusIndex >= 0 ? currentStatusIndex : lastDoneIndex;
            const leftAccent =
              currentStatusIndex >= 0 ? i < fillRef : i <= fillRef;
            const rightAccent = i < fillRef;
            return (
              <li
                key={it.id}
                className="relative flex flex-col items-center text-center flex-1 min-w-[130px] sm:min-w-0 px-2"
              >
                {/* spojovací čára — levá a pravá půlka zvlášť (za tečkou) */}
                {!isFirst && (
                  <span
                    aria-hidden
                    className="absolute top-[11px] left-0 w-1/2 h-0.5"
                    style={{ background: leftAccent ? "var(--accent)" : "var(--line)" }}
                  />
                )}
                {!isLast && (
                  <span
                    aria-hidden
                    className="absolute top-[11px] right-0 w-1/2 h-0.5"
                    style={{ background: rightAccent ? "var(--accent)" : "var(--line)" }}
                  />
                )}
                {/* pohyblivý PRŮBĚŽNÝ bod (menší, pulzující) ve středu mezi předchozím
                    a aktuálním milníkem (na levém okraji slotu). */}
                {currentBetween && (
                  <span
                    aria-hidden
                    className="absolute left-0 top-[11px] -translate-x-1/2 -translate-y-1/2 z-20 w-3.5 h-3.5 rounded-full animate-pulse"
                    style={{
                      background: "var(--accent)",
                      boxShadow:
                        "0 0 0 4px color-mix(in srgb, var(--accent) 25%, transparent)",
                    }}
                  />
                )}
                {/* MILNÍK — puntík vždy (na slotu), trochu větší. Done = plný, jinak obrys. */}
                <span className="relative z-10 h-6 flex items-center justify-center">
                  <span
                    aria-hidden
                    className="w-6 h-6 rounded-full border-2"
                    style={{
                      background: done ? "var(--accent)" : "var(--bg)",
                      borderColor: "var(--accent)",
                    }}
                  />
                </span>
                {it.dateLabel && (
                  <div className="ui-eyebrow ui-muted mt-3">{it.dateLabel}</div>
                )}
                <div
                  className={`ui-display font-bold leading-tight mt-1 text-sm sm:text-base ${
                    current ? "ui-accent" : done ? "" : "ui-muted"
                  }`}
                >
                  {it.linkUrl ? (
                    <a
                      href={it.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-inherit hover:underline"
                    >
                      {it.title}{" "}
                      <span aria-hidden className="ui-accent">
                        ↗
                      </span>
                    </a>
                  ) : (
                    it.title
                  )}
                </div>
                {current && (
                  <div className="ui-eyebrow ui-accent mt-1">{t("now")}</div>
                )}
                {it.detail && (
                  <p className="text-xs ui-muted leading-relaxed mt-1">
                    {it.detail}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
