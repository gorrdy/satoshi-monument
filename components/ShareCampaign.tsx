"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useLocaleSwitch } from "./I18nProvider";
import ShareButtons from "./ShareButtons";

/** Sdílení aktuálního stavu sbírky (homepage) — sociální sítě + obrázek se stavem. */
export default function ShareCampaign() {
  const t = useTranslations("share");
  const td = useTranslations("diky");
  const { locale } = useLocaleSwitch();
  const [url, setUrl] = useState("https://satoshi.jednadvacet.org");

  useEffect(() => {
    setUrl(`${window.location.origin}/${locale}`);
  }, [locale]);

  return (
    <div className="ui-card p-6 sm:p-7 max-w-3xl mx-auto text-center">
      <h3 className="ui-display text-xl font-bold">{t("title")}</h3>
      <p className="ui-muted text-sm leading-relaxed mt-1 mb-5 max-w-md mx-auto">
        {t("lead")}
      </p>
      <ShareButtons
        url={url}
        text={td("shareText")}
        downloadHref={`/${locale}/share-image`}
      />
    </div>
  );
}
