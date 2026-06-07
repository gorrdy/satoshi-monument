import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Varianta2Content from "@/components/Varianta2Content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return {
    title: t("varianta2.title"),
    description: t("meta.dalsiDesc"),
    alternates: {
      canonical: `/${locale}/dalsi`,
      languages: { cs: "/cs/dalsi", en: "/en/dalsi" },
    },
  };
}

export default async function DalsiPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Varianta2Content />;
}
