"use client";

import { useTranslations } from "next-intl";
import ProgressBar from "./ProgressBar";
import SupporterWall from "./SupporterWall";
import Reveal from "./Reveal";
import { useCampaignStats } from "./StatsProvider";

export default function Campaign() {
  const t = useTranslations();
  const { stats, wall } = useCampaignStats();

  return (
    <>
      {/* Progress bar — široký pás pod hero */}
      <section id="raised" className="px-4 pt-8 pb-16 sm:pt-10 sm:pb-20 ui-border-b">
        <div className="mx-auto w-full max-w-6xl ui-card p-7 sm:p-10">
          <ProgressBar stats={stats} />
          <p className="mt-6 ui-border-t pt-5 text-center text-sm ui-muted">
            <span className="ui-accent">⚡</span> {t("progress.goalExplainer")}
          </p>
          <p className="mt-2 text-center text-sm ui-muted max-w-2xl mx-auto leading-relaxed">
            {t("progress.overflowNote")}
          </p>
        </div>
      </section>

      {/* Zeď přispěvatelů */}
      <section id="wall" className="px-4 py-20 sm:py-24 ui-border-b">
        <Reveal className="mb-10 text-center max-w-2xl mx-auto">
          <span className="ui-eyebrow ui-accent">{t("nav.wall")}</span>
          <h2 className="ui-display text-4xl sm:text-5xl mt-3 leading-[1.0]">
            {t("wall.title")}
          </h2>
          <p className="ui-muted mt-2">{t("wall.subtitle")}</p>
          <div className="ui-accent-box px-4 py-3 mt-5 text-sm rounded-[var(--radius-sm)] text-left max-w-xl mx-auto space-y-2">
            <p className="flex items-start gap-2 font-medium">
              <span className="ui-accent text-base leading-none">🏆</span>
              {t("wall.repeatHint")}
            </p>
            <p className="flex items-start gap-2 font-medium">
              <span className="ui-accent text-base leading-none">👥</span>
              <span>
                {t("wall.groupHint")}{" "}
                <a
                  href="mailto:monument@jednadvacet.org"
                  className="ui-link font-medium"
                >
                  monument@jednadvacet.org
                </a>
                .
              </span>
            </p>
          </div>
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
