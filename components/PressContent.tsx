"use client";

import { useTranslations, useLocale } from "next-intl";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import BackLink from "./BackLink";

interface Article {
  outlet: string; // název média
  title: string; // titulek (zůstává v původním jazyce článku)
  url: string;
  date: string; // ISO YYYY-MM-DD
}

// Mediální výstupy o pražské soše Satoshiho. Nový článek = přidat řádek
// (řadí se automaticky od nejnovějšího).
const ARTICLES: Article[] = [
  {
    outlet: "Simplecoin",
    title:
      "Česká komunita vybrala 1 BTC na sochu Satoshiho Nakamota v Praze!",
    url: "https://blog.simplecoin.eu/cs/ceska-komunita-vybrala-1-btc-na-sochu-satoshiho-nakamota-v-praze/",
    date: "2026-06-20",
  },
  {
    outlet: "Peníze.cz",
    title: "Propad ceny bitcoinu spustil nákupy. Satoshi bude mít sochu v Praze",
    url: "https://www.penize.cz/kryptomeny/41984-propad-ceny-bitcoinu-spustil-nakupy-satoshi-bude-mit-sochu-v-praze",
    date: "2026-06-20",
  },
  {
    outlet: "Investiční web",
    title:
      "V Praze vyroste socha Satoshiho Nakamota. Komunita na ni vybrala přes jeden bitcoin",
    url: "https://www.investicniweb.cz/aktuality/324110-v-praze-vyroste-socha-satoshiho-nakamota-komunita-na-ni-vybrala-pres-jeden-bitcoin",
    date: "2026-06-19",
  },
  {
    outlet: "Kryptohodler",
    title:
      "V Praze vyroste socha Satoshiho Nakamota. Česká komunita už vybrala přes 1 BTC",
    url: "https://kryptohodler.cz/v-praze-vyroste-socha-satoshiho-nakamota-ceska-komunita-uz-vybrala-pres-1-btc/",
    date: "2026-06-18",
  },
  {
    outlet: "Kryptomagazín",
    title:
      "Praha se dočká sochy tvůrce Bitcoinu, komunita vybrala přes jeden celý bitcoin",
    url: "https://kryptomagazin.cz/praha-se-docka-sochy-tvurce-bitcoinu-komunita-vybrala-pres-jeden-cely-bitcoin/",
    date: "2026-06-18",
  },
];

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export default function PressContent() {
  const t = useTranslations("press");
  const locale = useLocale();
  const fmtDate = (iso: string) => {
    const d = new Date(iso + "T00:00:00Z");
    if (isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "cs-CZ", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(d);
  };
  const articles = [...ARTICLES].sort((a, b) => b.date.localeCompare(a.date));

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

          {articles.length === 0 ? (
            <p className="ui-muted py-10 text-center">{t("empty")}</p>
          ) : (
            <ul className="space-y-4">
              {articles.map((a) => (
                <li key={a.url}>
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block ui-card p-5 sm:p-6 transition hover:brightness-110"
                  >
                    <div className="flex items-center gap-2 ui-eyebrow ui-muted mb-2">
                      <span className="ui-accent font-bold">{a.outlet}</span>
                      <span aria-hidden>·</span>
                      <span>{fmtDate(a.date)}</span>
                    </div>
                    <h2 className="ui-display text-xl sm:text-2xl font-bold leading-snug">
                      {a.title}
                    </h2>
                    <span className="inline-flex items-center gap-1.5 ui-eyebrow ui-accent mt-3">
                      {t("readMore")}
                      <span className="text-xs ui-muted">({hostOf(a.url)})</span>
                      <span
                        aria-hidden
                        className="inline-block transition-transform group-hover:translate-x-1"
                      >
                        ↗
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
