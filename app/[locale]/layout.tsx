import type { Metadata, Viewport } from "next";
import { Geist, Fraunces, JetBrains_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import ScrollRestore from "@/components/ScrollRestore";
import Tracker from "@/components/Tracker";
import I18nProvider from "@/components/I18nProvider";
import StatsProvider from "@/components/StatsProvider";
import "@/app/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});
const jetMono = JetBrains_Mono({
  variable: "--font-jet",
  subsets: ["latin"],
  display: "swap",
});
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Vypnutý zoom (řeší podivné přibližování na mobilu při scrollu/vyplňování).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#08080b",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return {
    metadataBase: new URL(siteUrl),
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `/${locale}`,
      languages: { cs: "/cs", en: "/en" },
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: siteUrl,
      siteName: "Satoshi Monument",
      locale: locale === "en" ? "en_US" : "cs_CZ",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "meta" });
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  // Strukturovaná data pro vyhledávače i AI agenty (schema.org).
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["Organization", "NGO"],
        "@id": `${siteUrl}/#org`,
        name: "The Malahar Network z.s.",
        url: siteUrl,
        logo: `${siteUrl}/bitcoin.webp`,
        email: "monument@jednadvacet.org",
        sameAs: [siteUrl],
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: `${siteUrl}/${locale}`,
        name: t("title"),
        description: t("description"),
        inLanguage: locale === "en" ? "en" : "cs",
        publisher: { "@id": `${siteUrl}/#org` },
      },
    ],
  };

  return (
    <html
      lang={locale}
      data-theme="midnight"
      className={`${geistSans.variable} ${jetMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <I18nProvider initialLocale={locale}>
          <StatsProvider>
            <ScrollRestore />
            <Tracker />
            {children}
          </StatsProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
