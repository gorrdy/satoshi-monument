import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PravidlaContent from "@/components/PravidlaContent";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return {
    title: t("pravidla.title"),
    description: t("meta.pravidlaDesc"),
    alternates: {
      canonical: `/${locale}/pravidla`,
      languages: { cs: "/cs/pravidla", en: "/en/pravidla" },
    },
  };
}

export default async function PravidlaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PravidlaContent />;
}
