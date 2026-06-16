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

  // Index aktuálního bodu: „current", jinak poslední „done", jinak -1.
  const currentIndex = (() => {
    const c = items.findIndex((x) => x.status === "current");
    if (c >= 0) return c;
    let last = -1;
    items.forEach((x, i) => {
      if (x.status === "done") last = i;
    });
    return last;
  })();

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
            // Oranžová čára vede od začátku po AKTUÁLNÍ bod a tam končí:
            //  levá půlka u bodu i je oranžová, když i ≤ current; pravá, když i < current.
            const leftAccent = i <= currentIndex;
            const rightAccent = i < currentIndex;
            return (
              <li
                key={it.id}
                className="relative flex flex-col items-center text-center flex-1 min-w-[130px] sm:min-w-0 px-2"
              >
                {/* spojovací čára — levá a pravá půlka zvlášť (za tečkou) */}
                {!isFirst && (
                  <span
                    aria-hidden
                    className="absolute top-[9px] left-0 w-1/2 h-0.5"
                    style={{ background: leftAccent ? "var(--accent)" : "var(--line)" }}
                  />
                )}
                {!isLast && (
                  <span
                    aria-hidden
                    className="absolute top-[9px] right-0 w-1/2 h-0.5"
                    style={{ background: rightAccent ? "var(--accent)" : "var(--line)" }}
                  />
                )}
                {/* tečka — done = velký plný kruh; not-done = menší oranžový */}
                <span className="relative z-10 h-5 flex items-center justify-center">
                  <span
                    aria-hidden
                    className={`rounded-full border-2 ${
                      done ? "w-5 h-5" : "w-3 h-3"
                    } ${current ? "animate-pulse" : ""}`}
                    style={{
                      background: done
                        ? "var(--accent)"
                        : current
                          ? "var(--accent)"
                          : "var(--bg)",
                      borderColor: "var(--accent)",
                      boxShadow: current
                        ? "0 0 0 4px color-mix(in srgb, var(--accent) 25%, transparent)"
                        : undefined,
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
                  {it.title}
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
