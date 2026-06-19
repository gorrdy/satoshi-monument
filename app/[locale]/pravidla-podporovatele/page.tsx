import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PravidlaPodporovateleContent from "@/components/PravidlaPodporovateleContent";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return {
    title: t("pravidlaPodp.title"),
    description: t("pravidlaPodp.intro"),
    alternates: {
      canonical: `/${locale}/pravidla-podporovatele`,
      languages: {
        cs: "/cs/pravidla-podporovatele",
        en: "/en/pravidla-podporovatele",
      },
    },
  };
}

export default async function PravidlaPodporovatelePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PravidlaPodporovateleContent />;
}
