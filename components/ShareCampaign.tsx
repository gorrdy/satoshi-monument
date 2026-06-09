"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useLocaleSwitch } from "./I18nProvider";

/** Sdílení aktuálního stavu sbírky (homepage) — sociální sítě + obrázek se stavem. */
export default function ShareCampaign() {
  const t = useTranslations("share");
  const td = useTranslations("diky");
  const { locale } = useLocaleSwitch();
  const [url, setUrl] = useState("https://satoshi.jednadvacet.org");

  useEffect(() => {
    setUrl(`${window.location.origin}/${locale}`);
  }, [locale]);

  const u = encodeURIComponent(url);
  const tx = encodeURIComponent(td("shareText"));
  const links = [
    { key: "x", label: "X", href: `https://twitter.com/intent/tweet?text=${tx}&url=${u}` },
    { key: "tg", label: "Telegram", href: `https://t.me/share/url?url=${u}&text=${tx}` },
    { key: "wa", label: "WhatsApp", href: `https://wa.me/?text=${tx}%20${u}` },
    { key: "fb", label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
  ];

  return (
    <div className="ui-card p-6 sm:p-7 max-w-3xl mx-auto text-center">
      <h3 className="ui-display text-xl font-bold">{t("title")}</h3>
      <p className="ui-muted text-sm leading-relaxed mt-1 mb-5 max-w-md mx-auto">
        {t("lead")}
      </p>
      <div className="flex flex-wrap justify-center gap-2.5">
        {links.map((l) => (
          <a
            key={l.key}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="ui-border ui-soft press px-4 py-2 text-sm rounded-[var(--radius-sm)]"
          >
            {l.label} ↗
          </a>
        ))}
        <a
          href={`/${locale}/share-image`}
          target="_blank"
          rel="noopener noreferrer"
          className="ui-border ui-soft press px-4 py-2 text-sm rounded-[var(--radius-sm)]"
        >
          {t("download")} ⤓
        </a>
      </div>
    </div>
  );
}
