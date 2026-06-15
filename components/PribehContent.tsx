"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import BackLink from "./BackLink";
import DonorListFetcher from "./DonorListFetcher";

export default function PribehContent() {
  const t = useTranslations("pribeh");
  const praha = (t.raw("s2list") as string[]) ?? [];

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
      <main className="px-4 py-12 sm:py-16">
        <div className="max-w-3xl mx-auto">
          <BackLink />
          {/* Disclaimer o nefinálním stavu */}
          <div
            className="ui-border rounded-[var(--radius-sm)] px-4 py-3 mb-8 text-sm"
            style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)" }}
          >
            ⚠ {t("disclaimer")}
          </div>

          <h1 className="ui-display text-4xl sm:text-5xl font-bold mb-6 leading-[1.05]">
            {t("title")}
          </h1>

          <figure className="ui-card p-2 mb-10">
            <div className="relative aspect-[16/10] overflow-hidden ui-border rounded-[var(--radius-sm)]">
              <Image
                src="/socha-praha3.webp"
                alt="Satoshi Monument"
                fill
                sizes="(max-width: 768px) 100vw, 720px"
                className="object-cover object-top"
              />
            </div>
          </figure>

          <Section h={t("s1h")}>
            <p>{t("s1a")}</p>
          </Section>

          <Section h={t("s2h")}>
            <p>{t("s2a")}</p>
            <ul className="space-y-1.5">
              {praha.map((it, i) => (
                <li key={i} className="flex gap-2">
                  <span className="ui-accent">●</span>
                  <span>{it}</span>
                </li>
              ))}
            </ul>
            <p className="font-medium" style={{ color: "var(--fg)" }}>
              {t("s2foot")}
            </p>
          </Section>

          <Section h={t("s3h")}>
            <p>{t("s3a")}</p>
          </Section>
          <Section h={t("s4h")}>
            <p>{t("s4a")}</p>
          </Section>
          <Section h={t("s5h")}>
            <p>{t("s5a")}</p>
          </Section>
        </div>

        {/* Seznam přispěvatelů dole na stránce */}
        <div className="max-w-6xl mx-auto mt-6">
          <h2 className="ui-display text-3xl font-bold text-center mb-8">
            {t("donorsTitle")}
          </h2>
          <DonorListFetcher />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
