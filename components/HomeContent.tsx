"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { useLocaleSwitch } from "@/components/I18nProvider";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import Campaign from "@/components/Campaign";
import Roadmap from "@/components/Roadmap";
import DonationWidget from "@/components/DonationWidget";
import InstallationsCarousel from "@/components/InstallationsCarousel";
import HeroStats from "@/components/HeroStats";
import RecentDonations from "@/components/RecentDonations";
import Reveal from "@/components/Reveal";
import ShareCampaign from "@/components/ShareCampaign";
import { useCampaignStats } from "@/components/StatsProvider";
import { formatBtc } from "@/lib/format";

export default function HomeContent() {
  const t = useTranslations();
  const { locale } = useLocaleSwitch();
  const { stats, close } = useCampaignStats();
  const closed = close?.closed === true;

  return (
    <>
      <SiteHeader onHome />

      <main>
      {/* Hero — obrázek na celou šířku jako pozadí, formulář vpravo */}
      <section className="relative overflow-hidden ui-border-b min-h-[34rem] lg:min-h-[40rem]">
        {/* Obrázek na pozadí — PEVNÁ výška, nezávislá na obsahu (rozbalení formuláře jím nehne) */}
        <div
          aria-hidden
          className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-[34rem] lg:h-[40rem] overflow-hidden rounded-[var(--radius)] pointer-events-none"
        >
          <Image
            src="/socha-praha3.webp"
            alt={t("hero.imageCaption")}
            fill
            priority
            sizes="100vw"
            // Socha je zhruba na středu → mírný bias k ní pro úzký mobilní ořez.
            className="object-cover object-[45%_top]"
          />
          {/* Překryvy laděné podle tématu (čitelnost textu vlevo + napojení dolů) */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to right, var(--bg) 0%, color-mix(in srgb, var(--bg) 80%, transparent) 20%, transparent 58%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(to top, var(--bg) 0%, transparent 42%)",
            }}
          />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 pt-20 sm:pt-24 pb-16 grid lg:grid-cols-2 gap-10 lg:gap-12 items-start">
          {/* Text vlevo */}
          <div className="lg:pt-6">
            <span
              className="animate-fade-up inline-block ui-eyebrow ui-accent-box px-3 py-1.5 mb-6"
              style={{ animationDelay: "0ms" }}
            >
              {t("hero.badge")}
            </span>
            <h1
              className="animate-fade-up text-shadow-hero ui-display text-5xl sm:text-6xl lg:text-7xl leading-[1.0]"
              style={{ animationDelay: "60ms" }}
            >
              {t("hero.line1")} <span className="ui-hl">{t("hero.line2")}</span>
            </h1>
            <p
              className="animate-fade-up text-shadow-hero mt-6 text-lg ui-muted max-w-md leading-relaxed"
              style={{ animationDelay: "120ms" }}
            >
              {t("hero.subtitle")}
            </p>
            <div
              className="animate-fade-up mt-7"
              style={{ animationDelay: "180ms" }}
            >
              <HeroStats />
              <RecentDonations />
            </div>
          </div>

          {/* Formulář vpravo — po uzavření sbírky finální „poděkování" + rozcestník */}
          <div
            id="donate"
            className="animate-fade-up scroll-mt-24 w-full max-w-md mx-auto lg:mx-0 lg:ml-auto"
            style={{ animationDelay: "200ms" }}
          >
            {closed ? (
              <div className="ui-card p-6 sm:p-8 text-center">
                <div className="text-5xl mb-3">🎉</div>
                <h3 className="ui-display text-2xl font-bold mb-2">
                  {t("closed.title")}
                </h3>
                <p className="ui-muted mb-3">{t("closed.body")}</p>
                <p className="ui-mono ui-accent font-bold text-2xl leading-none">
                  {formatBtc(stats?.raisedBtc ?? 0)} BTC
                </p>
                <p className="ui-muted text-sm mt-1 mb-5">
                  {t("closed.from")} {stats?.donorCount ?? 0} {t("closed.donors")}
                </p>
                <div className="flex flex-col gap-2.5">
                  <a
                    href={`/${locale}/pribeh`}
                    className="ui-btn press px-4 py-2.5 text-sm"
                  >
                    {t("closed.storyCta")}
                  </a>
                  <a
                    href={`/${locale}/podporovatele`}
                    className="ui-eyebrow ui-link underline underline-offset-2"
                  >
                    {t("closed.supportersCta")} →
                  </a>
                </div>
              </div>
            ) : (
              <DonationWidget />
            )}
          </div>
        </div>
      </section>

      {/* Sbírka (progress) a zeď přispěvatelů */}
      <Campaign />

      {/* Roadmapa / kde aktuálně jsme */}
      <Roadmap />

      {/* Metropole, kde socha už stojí */}
      <section id="cities" className="px-4 py-20 sm:py-24 ui-border-b">
        <Reveal className="max-w-4xl mx-auto text-center mb-10">
          <span className="ui-eyebrow ui-accent">{t("nav.cities")}</span>
          <h2 className="ui-display text-4xl sm:text-5xl mt-3 leading-[1.0]">
            {t("cities.title")}
          </h2>
          <p className="ui-muted mt-3">{t("cities.subtitle")}</p>
        </Reveal>
        <Reveal delay={120}>
          <InstallationsCarousel />
        </Reveal>
      </section>

      {/* Sdílení sbírky — předposlední, před O projektu */}
      <section className="px-4 py-16 sm:py-20 ui-border-b">
        <ShareCampaign />
      </section>

      {/* O projektu */}
      <section id="about" className="px-4 py-20 sm:py-28 ui-soft ui-border-b">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <Reveal className="order-2 lg:order-1">
            <span className="ui-eyebrow ui-accent">
              {"// "}
              {t("nav.about")}
            </span>
            <h2 className="ui-display text-4xl sm:text-5xl mt-3 mb-6 leading-[1.0]">
              {t("about.title")}
            </h2>
            <div className="space-y-4 ui-muted leading-relaxed">
              <p>{t("about.p1")}</p>
              <p>{t("about.p2")}</p>
              <p>{t("about.p3")}</p>
            </div>
            <div className="mt-5 flex flex-col gap-2.5">
              <a
                href="https://satoshigallery.com"
                target="_blank"
                rel="noopener noreferrer"
                className="ui-eyebrow ui-link inline-block"
              >
                {t("about.galleryLink")} ↗
              </a>
              <a
                href={`/${locale}/dalsi`}
                className="group ui-eyebrow ui-accent font-bold inline-flex items-center gap-1.5 underline underline-offset-4 decoration-2"
              >
                {t("about.moreLink")}
                <span
                  aria-hidden
                  className="inline-block transition-transform group-hover:translate-x-1"
                >
                  →
                </span>
              </a>
            </div>
          </Reveal>
          <Reveal delay={120} className="order-1 lg:order-2">
            <figure className="ui-card p-2 max-w-sm mx-auto">
              <div className="relative aspect-[5/7] overflow-hidden ui-border">
                <Image
                  src="/we-are-all-satoshi.webp"
                  alt={t("about.imageCaption")}
                  fill
                  sizes="(max-width: 1024px) 90vw, 400px"
                  className="object-cover"
                />
              </div>
              <figcaption className="ui-eyebrow ui-muted mt-2 px-1">
                {t("about.imageCaption")}
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </section>
      </main>

      <SiteFooter />
    </>
  );
}
