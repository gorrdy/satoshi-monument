"use client";

import { useTranslations } from "next-intl";
import ProgressBar from "./ProgressBar";
import SupporterWall from "./SupporterWall";
import Reveal from "./Reveal";
import { useCampaignStats } from "./StatsProvider";
import RecentTicker from "./RecentTicker";

export default function Campaign() {
  const t = useTranslations();
  const { stats, wall, recent } = useCampaignStats();

  return (
    <>
      {/* Progress bar — široký pás pod hero */}
      <section id="raised" className="px-4 pt-8 pb-16 sm:pt-10 sm:pb-20 ui-border-b">
        <div className="mx-auto w-full max-w-6xl ui-card p-7 sm:p-10">
          <ProgressBar stats={stats} />
          <p className="mt-6 ui-border-t pt-5 text-center text-sm ui-muted">
            <span className="ui-accent">⚡</span> {t("progress.goalExplainer")}
          </p>
        </div>
      </section>

      {/* Živý ticker posledních příspěvků */}
      {recent.length > 0 && (
        <section className="ui-soft ui-border-b py-3 overflow-hidden">
          <div className="max-w-6xl mx-auto px-4 flex items-center gap-3 sm:gap-5">
            <span className="ui-eyebrow ui-accent flex items-center gap-2 shrink-0">
              <span
                aria-hidden
                className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse"
              />
              <span className="hidden sm:inline">{t("progress.recent")}</span>
            </span>
            <RecentTicker recent={recent} />
          </div>
        </section>
      )}

      {/* Zeď přispěvatelů */}
      <section id="wall" className="px-4 py-20 sm:py-24 ui-border-b">
        <Reveal className="mb-10 text-center max-w-2xl mx-auto">
          <span className="ui-eyebrow ui-accent">{t("nav.wall")}</span>
          <h2 className="ui-display text-4xl sm:text-5xl mt-3 leading-[1.0]">
            {t("wall.title")}
          </h2>
          <p className="ui-muted mt-2">{t("wall.subtitle")}</p>
        </Reveal>

        {/* Princip sčítání — schované pod rozbalovátkem, ať to nepřebíjí zeď */}
        <details className="group max-w-3xl mx-auto mb-10">
          <summary className="ui-link ui-eyebrow flex items-center justify-center gap-2 cursor-pointer list-none select-none text-center">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full ui-border text-xs">
              ?
            </span>
            {t("wall.principleLink")}
            <span className="inline-block transition-transform group-open:rotate-180 text-xs">
              ↓
            </span>
          </summary>
          <div className="ui-card p-6 sm:p-8 mt-4">
            <div className="space-y-4">
              {(["1", "2", "3"] as const).map((n) => (
                <div key={n}>
                  <p className="font-semibold" style={{ color: "var(--fg)" }}>
                    {t(`princip.q${n}`)}
                  </p>
                  <p className="ui-muted leading-relaxed mt-1">
                    {t(`princip.a${n}`)}
                  </p>
                </div>
              ))}
            </div>
            <p className="ui-accent-box px-4 py-3 mt-6 text-sm font-medium rounded-[var(--radius-sm)]">
              <span className="ui-accent">★</span> {t("princip.highlight")}
            </p>
            <p className="text-sm ui-muted leading-relaxed mt-4">
              {t("princip.contact")}{" "}
              <a
                href="mailto:monument@jednadvacet.org"
                className="ui-link font-medium"
              >
                monument@jednadvacet.org
              </a>
              .
            </p>
          </div>
        </details>

        <SupporterWall wall={wall} search />
      </section>
    </>
  );
}
