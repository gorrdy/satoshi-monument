import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import ThankYouContent from "@/components/ThankYouContent";

// Děkovná stránka po platbě — neindexovat (není to obsahová stránka).
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};
// Čte query params (?amt=&cur=) → dynamická.
export const dynamic = "force-dynamic";

export default async function DikyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ThankYouContent />;
}
