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
            <div className="ui-card p-6 text-center ui-muted text-sm mt-2">
              {t("partnersPlaceholder")}
            </div>
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
