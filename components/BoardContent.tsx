"use client";

import { useTranslations } from "next-intl";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import BackLink from "./BackLink";

export default function BoardContent() {
  const t = useTranslations("board");
  const members = (t.raw("members") as string[]) ?? [];

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
                {t("originTitle")}
              </h2>
              <p className="ui-muted leading-relaxed">{t("originBody")}</p>
            </section>

            <section className="ui-card p-6">
              <h2 className="ui-display text-2xl font-bold mb-2 ui-accent">
                {t("voteTitle")}
              </h2>
              <p className="ui-muted leading-relaxed">{t("voteBody")}</p>
              <p className="ui-muted leading-relaxed mt-3">{t("voteApproved")}</p>
            </section>

            <section className="ui-card p-6">
              <h2 className="ui-display text-2xl font-bold mb-3 ui-accent">
                {t("membersTitle")}
              </h2>
              <ul className="flex flex-wrap gap-2">
                {members.map((m) => (
                  <li
                    key={m}
                    className="ui-soft ui-border rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium"
                  >
                    {m}
                  </li>
                ))}
              </ul>
              <p className="ui-muted leading-relaxed text-sm mt-4">
                {t("membersNote")}
              </p>
            </section>

            <section className="ui-card p-6">
              <h2 className="ui-display text-2xl font-bold mb-2 ui-accent">
                {t("powersTitle")}
              </h2>
              <p className="ui-muted leading-relaxed">{t("powersBody")}</p>
            </section>
          </div>

          <section className="mt-8 ui-border-t pt-8">
            <h2 className="ui-display text-xl font-bold mb-2">{t("orgTitle")}</h2>
            <p className="ui-muted leading-relaxed">{t("orgBody")}</p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
