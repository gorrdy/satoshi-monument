"use client";

import { useTranslations } from "next-intl";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import BackLink from "./BackLink";

export default function Varianta2Content() {
  const t = useTranslations("varianta2");
  const crit = (t.raw("s2list") as string[]) ?? [];

  const Section = ({ h, children }: { h: string; children: React.ReactNode }) => (
    <section className="mb-8">
      <h2 className="ui-display text-2xl sm:text-3xl font-bold mb-3 leading-tight">
        {h}
      </h2>
      <div className="ui-muted leading-relaxed space-y-3">{children}</div>
    </section>
  );

  return (
    <>
      <SiteHeader />
      <main className="px-4 py-16 sm:py-20">
        <div className="max-w-3xl mx-auto">
          <BackLink />
          <span className="ui-eyebrow ui-accent">{"// "}Satoshi Monument</span>
          <h1 className="ui-display text-4xl sm:text-5xl font-bold mt-3 mb-5 leading-[1.05]">
            {t("title")}
          </h1>
          <p className="text-lg ui-muted leading-relaxed mb-10">{t("intro")}</p>

          <Section h={t("s1h")}>
            <p>{t("s1a")}</p>
          </Section>

          <Section h={t("s2h")}>
            <p>{t("s2a")}</p>
            {crit.length > 0 && (
              <ul className="space-y-1.5">
                {crit.map((it, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="ui-accent">→</span>
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            )}
            <p>{t("s2foot")}</p>
          </Section>

          <Section h={t("s3h")}>
            <p>{t("s3a")}</p>
          </Section>

          <Section h={t("s4h")}>
            <p>{t("s4a")}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
              <a
                href="https://2bminer.com"
                target="_blank"
                rel="noopener noreferrer"
                title="2Bminer"
                className="flex items-center justify-center ui-soft ui-border rounded-[var(--radius-sm)] p-5 h-24 hover:brightness-110 transition cursor-pointer select-none"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/partners/2bminer.svg"
                  alt="2Bminer"
                  draggable={false}
                  className="max-h-12 w-auto object-contain pointer-events-none select-none"
                />
              </a>
              <a
                href="https://generalbytes.com"
                target="_blank"
                rel="noopener noreferrer"
                title="GENERAL BYTES"
                className="flex items-center justify-center overflow-hidden ui-border rounded-[var(--radius-sm)] h-24 hover:brightness-110 transition cursor-pointer select-none"
                style={{ background: "#1f57a0" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/partners/generalbytes.webp"
                  alt="GENERAL BYTES"
                  draggable={false}
                  className="h-full w-auto object-contain pointer-events-none select-none"
                />
              </a>
              <a
                href="https://jednadvacet.org"
                target="_blank"
                rel="noopener noreferrer"
                title="Jednadvacet"
                className="flex items-center justify-center ui-soft ui-border rounded-[var(--radius-sm)] p-5 h-24 hover:brightness-110 transition cursor-pointer select-none"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/partners/jednadvacet.webp"
                  alt="Jednadvacet"
                  draggable={false}
                  className="max-h-12 w-auto object-contain pointer-events-none select-none"
                />
              </a>
              <a
                href="https://confirmo.net"
                target="_blank"
                rel="noopener noreferrer"
                title="Confirmo"
                className="flex items-center justify-center overflow-hidden ui-border rounded-[var(--radius-sm)] h-24 px-5 hover:brightness-110 transition cursor-pointer select-none"
                style={{ background: "#3a1f7d" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/partners/confirmo.webp"
                  alt="Confirmo"
                  draggable={false}
                  className="max-h-8 w-auto max-w-full object-contain pointer-events-none select-none"
                />
              </a>
            </div>
            <p className="ui-muted text-sm mt-3">{t("partnersPlaceholder")}</p>
          </Section>

          {/* CTA pro partnery */}
          <section className="ui-card p-7 text-center mt-10">
            <h2 className="ui-display text-2xl font-bold mb-2">{t("ctaH")}</h2>
            <p className="ui-muted leading-relaxed mb-5 max-w-xl mx-auto">
              {t("ctaA")}
            </p>
            <a
              href="mailto:monument@jednadvacet.org"
              className="ui-btn press px-6 py-3 inline-block"
            >
              {t("ctaBtn")} →
            </a>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
