import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PressContent from "@/components/PressContent";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return {
    title: t("press.title"),
    description: t("press.intro"),
    alternates: {
      canonical: `/${locale}/napsali-o-nas`,
      languages: {
        cs: "/cs/napsali-o-nas",
        en: "/en/napsali-o-nas",
      },
    },
  };
}

export default async function NapsaliONasPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PressContent />;
}
