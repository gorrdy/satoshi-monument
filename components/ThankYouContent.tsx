"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useLocaleSwitch } from "./I18nProvider";
import { formatBtc, formatCzk } from "@/lib/format";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import ShareButtons from "./ShareButtons";

export default function ThankYouContent() {
  const t = useTranslations("diky");
  const { locale } = useLocaleSwitch();
  const params = useSearchParams();
  const [shareUrl, setShareUrl] = useState("https://satoshi.jednadvacet.org");

  useEffect(() => {
    // Sdílíme veřejnou hlavní stránku (ne /diky).
    setShareUrl(`${window.location.origin}/${locale}`);
  }, [locale]);

  // Personalizace částkou z platby (?amt=&cur=).
  const amt = Number(params.get("amt"));
  const cur = params.get("cur");
  const amountLabel =
    Number.isFinite(amt) && amt > 0
      ? cur === "czk"
        ? `${formatCzk(amt)} Kč`
        : `${formatBtc(amt)} BTC`
      : null;

  return (
    <>
      <SiteHeader />
      <main className="px-4 py-16 sm:py-24">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="ui-display text-4xl sm:text-5xl font-bold mb-5 leading-[1.05]">
            {t("title")}
          </h1>
          {amountLabel && (
            <p className="ui-accent-box inline-block px-4 py-2 rounded-[var(--radius-sm)] font-bold mb-5">
              {t("amountThanks", { amount: amountLabel })}
            </p>
          )}
          <p className="text-lg ui-muted leading-relaxed mb-12">{t("lead")}</p>

          <div className="ui-card p-7 sm:p-9">
            <h2 className="ui-display text-2xl font-bold mb-2">
              {t("shareTitle")}
            </h2>
            <p className="ui-muted leading-relaxed mb-6 max-w-md mx-auto">
              {t("shareLead")}
            </p>

            <ShareButtons
              url={shareUrl}
              text={t("shareText")}
              downloadHref={`/${locale}/share-image`}
            />
          </div>

          <a
            href={`/${locale}`}
            className="ui-link ui-eyebrow inline-flex items-center gap-1.5 mt-10"
          >
            <span aria-hidden>←</span> {t("back")}
          </a>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
