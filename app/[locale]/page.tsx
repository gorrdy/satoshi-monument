import { setRequestLocale } from "next-intl/server";
import HomeContent from "@/components/HomeContent";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HomeContent />;
}
