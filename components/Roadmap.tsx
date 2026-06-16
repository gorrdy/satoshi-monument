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

  return (
    <section id="roadmap" className="px-4 py-20 sm:py-24 ui-border-b">
      <Reveal className="max-w-2xl mx-auto text-center mb-10">
        <span className="ui-eyebrow ui-accent">{t("eyebrow")}</span>
        <h2 className="ui-display text-4xl sm:text-5xl mt-3 leading-[1.0]">
          {t("title")}
        </h2>
        <p className="ui-muted mt-2">{t("subtitle")}</p>
      </Reveal>

      <ol className="max-w-2xl mx-auto relative ml-2">
        {items.map((it) => {
          const done = it.status === "done";
          const current = it.status === "current";
          return (
            <li
              key={it.id}
              className="relative pl-8 pb-8 last:pb-0 border-l-2"
              style={{
                borderColor: done ? "var(--accent)" : "var(--line)",
              }}
            >
              {/* tečka */}
              <span
                aria-hidden
                className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 ${
                  current ? "animate-pulse" : ""
                }`}
                style={{
                  background: done || current ? "var(--accent)" : "var(--bg)",
                  borderColor: done || current ? "var(--accent)" : "var(--line)",
                  boxShadow: current ? "0 0 0 4px color-mix(in srgb, var(--accent) 25%, transparent)" : undefined,
                }}
              />
              {it.dateLabel && (
                <div className="ui-eyebrow ui-muted mb-0.5">{it.dateLabel}</div>
              )}
              <div
                className={`ui-display font-bold leading-tight ${
                  current ? "ui-accent" : done ? "" : "ui-muted"
                }`}
              >
                {it.title}
                {done && <span className="ml-2 ui-accent">✓</span>}
                {current && (
                  <span className="ml-2 ui-eyebrow ui-accent align-middle">
                    {t("now")}
                  </span>
                )}
              </div>
              {it.detail && (
                <p className="text-sm ui-muted leading-relaxed mt-1">{it.detail}</p>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
