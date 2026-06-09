"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useLocaleSwitch } from "./I18nProvider";
import { CONFETTI_KEY } from "@/lib/confetti";

export default function SiteFooter() {
  const t = useTranslations();
  const { locale } = useLocaleSwitch();
  const [confetti, setConfetti] = useState(true);

  useEffect(() => {
    setConfetti(localStorage.getItem(CONFETTI_KEY) !== "off");
  }, []);

  const toggleConfetti = () => {
    const next = !confetti;
    setConfetti(next);
    localStorage.setItem(CONFETTI_KEY, next ? "on" : "off");
  };

  return (
    <footer className="mt-auto px-4 py-12 ui-soft text-center text-sm ui-muted">
      <div className="max-w-6xl mx-auto">
        <div className="ui-display text-xl font-bold mb-3 flex items-center justify-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/bitcoin.webp" alt="Bitcoin" className="w-7 h-7" />
          Satoshi Monument
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mb-4 ui-eyebrow">
          <a href={`/${locale}/pravidla`} className="ui-link">{t("nav.pravidla")}</a>
          <a href={`/${locale}/pribeh`} className="ui-link">{t("nav.pribeh")}</a>
          <a href={`/${locale}#wall`} className="ui-link">{t("nav.wall")}</a>
          <a href={`/${locale}#donate`} className="ui-link">{t("nav.donate")}</a>
        </nav>

        <p className="mb-3">{t("footer.tagline")}</p>
        <p className="max-w-xl mx-auto mb-3">{t("footer.org")}</p>
        <p className="mb-4">
          <a
            href="mailto:monument@jednadvacet.org"
            className="ui-accent hover:underline"
          >
            monument@jednadvacet.org
          </a>
        </p>

        <button
          onClick={toggleConfetti}
          className="ui-link ui-eyebrow"
          aria-pressed={confetti}
        >
          {confetti ? t("footer.confettiHide") : t("footer.confettiShow")}
        </button>
      </div>
    </footer>
  );
}
