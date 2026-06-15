"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useLocaleSwitch } from "./I18nProvider";
import { formatBtc, formatCzk, formatUsd } from "@/lib/format";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import ShareButtons from "./ShareButtons";

export default function ThankYouContent() {
  const t = useTranslations("diky");
  const { locale } = useLocaleSwitch();
  const params = useSearchParams();
  const [shareUrl, setShareUrl] = useState("https://satoshi.jednadvacet.org");
  const [rates, setRates] = useState<{ czk: number; usd: number } | null>(null);

  useEffect(() => {
    // Sdílíme veřejnou hlavní stránku (ne /diky).
    setShareUrl(`${window.location.origin}/${locale}`);
  }, [locale]);

  // Kurzy pro orientační $ ekvivalent (EN).
  useEffect(() => {
    if (locale !== "en") return;
    fetch("/api/stats", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.stats?.btcCzkRate && d?.stats?.btcUsdRate)
          setRates({ czk: d.stats.btcCzkRate, usd: d.stats.btcUsdRate });
      })
      .catch(() => {});
  }, [locale]);

  // Personalizace částkou z platby (?amt=&cur=).
  const amt = Number(params.get("amt"));
  const cur = params.get("cur");
  const validAmt = Number.isFinite(amt) && amt > 0;
  const amountLabel = validAmt
    ? cur === "czk"
      ? `${formatCzk(amt)} Kč`
      : `${formatBtc(amt)} BTC`
    : null;

  // EN: orientační USD ekvivalent zaplacené částky (aktuálním kurzem).
  const usdLabel =
    validAmt && locale === "en" && rates
      ? formatUsd(cur === "czk" ? (amt / rates.czk) * rates.usd : amt * rates.usd, locale)
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
              {usdLabel && (
                <span className="font-normal opacity-80"> · {t("approxUsd", { amount: usdLabel })}</span>
              )}
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

          <div className="mt-8">
            <h2 className="ui-display text-xl font-bold mb-2">
              {t("repeatTitle")}
            </h2>
            <p className="ui-muted leading-relaxed mb-4 max-w-md mx-auto">
              {t("repeatLead")}
            </p>
            <a
              href={`/${locale}#donate`}
              className="ui-btn press inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold"
            >
              <span aria-hidden>🏆</span> {t("repeatCta")}
            </a>
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
