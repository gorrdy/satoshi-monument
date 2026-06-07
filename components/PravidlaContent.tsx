"use client";

import { useTranslations } from "next-intl";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import BackLink from "./BackLink";

export default function PravidlaContent() {
  const t = useTranslations("pravidla");
  const items = (t.raw("moreItems") as string[]) ?? [];

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

            <section className="ui-card p-6">
              <h2 className="ui-display text-2xl font-bold mb-2 ui-accent">
                {t("noTitle")}
              </h2>
              <p className="ui-muted leading-relaxed">{t("noBody")}</p>
            </section>

            <section className="ui-card p-6">
              <h2 className="ui-display text-2xl font-bold mb-2 ui-accent">
                {t("moreTitle")}
              </h2>
              <p className="ui-muted leading-relaxed mb-3">{t("moreBody")}</p>
              <ul className="space-y-1.5 mb-3">
                {items.map((it, i) => (
                  <li key={i} className="flex gap-2 ui-muted">
                    <span className="ui-accent">→</span>
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm ui-muted">{t("moreNote")}</p>
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
