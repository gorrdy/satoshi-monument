import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import BoardContent from "@/components/BoardContent";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return {
    title: t("board.title"),
    description: t("board.intro"),
    alternates: {
      canonical: `/${locale}/board`,
      languages: {
        cs: "/cs/board",
        en: "/en/board",
      },
    },
  };
}

export default async function BoardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <BoardContent />;
}
