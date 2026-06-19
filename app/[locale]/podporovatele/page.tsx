import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SupportersContent from "@/components/SupportersContent";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return {
    title: t("supporters.title"),
    description: t("supporters.intro"),
    alternates: {
      canonical: `/${locale}/podporovatele`,
      languages: { cs: "/cs/podporovatele", en: "/en/podporovatele" },
    },
  };
}

export default async function SupportersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <SupportersContent />;
}
