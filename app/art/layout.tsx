import type { Metadata, Viewport } from "next";
import { Geist, Fraunces, JetBrains_Mono } from "next/font/google";
import Tracker from "@/components/Tracker";
import I18nProvider from "@/components/I18nProvider";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#08080b",
};

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://satoshi.jednadvacet.org";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Art & Bitcoin — úvod pro umělce | Satoshi Monument",
  description:
    "Krátký úvod do Bitcoinu, jeho étosu a příběhu Satoshiho Nakamota pro umělce, kteří chtějí přispět svým dílem k pražské soše Satoshiho.",
  alternates: { canonical: "/art" },
  openGraph: {
    title: "Art & Bitcoin — úvod pro umělce",
    description:
      "Co je Bitcoin, jeho étos, proč socha v Česku a kdo je Satoshi Nakamoto — úvod pro umělce.",
    url: `${SITE_URL}/art`,
    siteName: "Satoshi Monument",
    locale: "cs_CZ",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Art & Bitcoin — úvod pro umělce",
    description:
      "Co je Bitcoin, jeho étos, proč socha v Česku a kdo je Satoshi Nakamoto.",
  },
};

export default function ArtLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="cs"
      data-theme="midnight"
      className={`${geistSans.variable} ${jetMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <I18nProvider initialLocale="cs">
          <Tracker />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
