"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useLocaleSwitch } from "./I18nProvider";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";

export default function ThankYouContent() {
  const t = useTranslations("diky");
  const { locale } = useLocaleSwitch();
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState("https://satoshi.jednadvacet.org");

  useEffect(() => {
    // Sdílíme veřejnou hlavní stránku (ne /diky).
    setShareUrl(`${window.location.origin}/${locale}`);
  }, [locale]);

  const text = t("shareText");
  const u = encodeURIComponent(shareUrl);
  const tx = encodeURIComponent(text);

  const links = [
    { key: "x", href: `https://twitter.com/intent/tweet?text=${tx}&url=${u}` },
    { key: "telegram", href: `https://t.me/share/url?url=${u}&text=${tx}` },
    { key: "whatsapp", href: `https://wa.me/?text=${tx}%20${u}` },
    { key: "facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
  ] as const;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <>
      <SiteHeader />
      <main className="px-4 py-16 sm:py-24">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="ui-display text-4xl sm:text-5xl font-bold mb-5 leading-[1.05]">
            {t("title")}
          </h1>
          <p className="text-lg ui-muted leading-relaxed mb-12">{t("lead")}</p>

          <div className="ui-card p-7 sm:p-9">
            <h2 className="ui-display text-2xl font-bold mb-2">
              {t("shareTitle")}
            </h2>
            <p className="ui-muted leading-relaxed mb-6 max-w-md mx-auto">
              {t("shareLead")}
            </p>

            <div className="flex flex-col gap-3 max-w-sm mx-auto">
              {links.map((l) => (
                <a
                  key={l.key}
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ui-btn press w-full py-3"
                >
                  {t(l.key)} ↗
                </a>
              ))}
              <button
                onClick={copy}
                className="press w-full py-3 ui-border rounded-[var(--radius-sm)] ui-eyebrow"
              >
                {copied ? t("copied") : t("copy")}
              </button>
            </div>
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
