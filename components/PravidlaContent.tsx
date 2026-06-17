"use client";

import { useTranslations, useLocale } from "next-intl";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import BackLink from "./BackLink";

const AUSTRIA_URL =
  "https://pay.bitcoin-austria.at/apps/3B9v3QzPu9S3xyXFxZHmKgjmhWt9/crowdfund";

export default function PravidlaContent() {
  const t = useTranslations("pravidla");
  const locale = useLocale();
  const items = (t.raw("moreItems") as string[]) ?? [];

  const link = (href: string, external = false) =>
    (chunks: React.ReactNode) => (
      <a
        href={href}
        {...(external
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
        className="ui-accent font-medium underline underline-offset-2 hover:opacity-80"
      >
        {chunks}
        {external ? " ↗" : " →"}
      </a>
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

          <div className="space-y-5">
            <section className="ui-card p-6">
              <h2 className="ui-display text-2xl font-bold mb-2 ui-accent">
                {t("okTitle")}
              </h2>
              <p className="ui-muted leading-relaxed">{t("okBody")}</p>
            </section>

            <section id="vic" className="ui-card p-6 scroll-mt-24">
              <h2 className="ui-display text-2xl font-bold mb-2 ui-accent">
                {t("moreTitle")}
              </h2>
              <div className="ui-muted leading-relaxed space-y-3">
                <p>{t("moreP1")}</p>
                <p>{t.rich("moreP2", { at: link(AUSTRIA_URL, true) })}</p>
                <p>{t("moreP3")}</p>
                <p>{t("moreItemsIntro")}</p>
                {items.length > 0 && (
                  <ul className="space-y-1.5">
                    {items.map((it, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="ui-accent">→</span>
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p>{t("moreP4")}</p>
                <p>{t.rich("moreP5", { vic: link(`/${locale}/dalsi`) })}</p>
                <p>{t("moreP6")}</p>
              </div>
            </section>

            <section className="ui-card p-6">
              <h2 className="ui-display text-2xl font-bold mb-2 ui-accent">
                {t("noTitle")}
              </h2>
              <p className="ui-muted leading-relaxed">{t("noBody")}</p>
            </section>
          </div>

          <section className="mt-8 ui-border-t pt-8">
            <h2 className="ui-display text-xl font-bold mb-2">{t("transTitle")}</h2>
            <p className="ui-muted leading-relaxed">{t("transBody")}</p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
