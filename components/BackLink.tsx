"use client";

import { useTranslations } from "next-intl";
import { useLocaleSwitch } from "./I18nProvider";

/** Šipka zpět na hlavní stránku — pro samostatné stránky (Pravidla, Příběh, Varianta 2). */
export default function BackLink() {
  const t = useTranslations("common");
  const { locale } = useLocaleSwitch();

  return (
    <a
      href={`/${locale}`}
      className="ui-link ui-eyebrow inline-flex items-center gap-1.5 mb-6"
    >
      <span aria-hidden>←</span> {t("back")}
    </a>
  );
}
