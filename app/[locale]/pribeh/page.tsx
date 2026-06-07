import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PribehContent from "@/components/PribehContent";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return {
    title: t("pribeh.title"),
    description: t("meta.pribehDesc"),
    alternates: {
      canonical: `/${locale}/pribeh`,
      languages: { cs: "/cs/pribeh", en: "/en/pribeh" },
    },
  };
}

export default async function PribehPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PribehContent />;
}
