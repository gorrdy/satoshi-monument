import { setRequestLocale } from "next-intl/server";

export const dynamic = "force-dynamic";

// Veřejná stránka s vloženým PDF reportem (generuje se hodinově).
export default async function ReportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const en = locale === "en";

  return (
    <div className="flex flex-col h-[100dvh]">
      <header className="ui-border-b bg-[var(--bg)]/90 backdrop-blur px-4 h-14 flex items-center justify-between gap-3 shrink-0">
        <a
          href={`/${locale}`}
          className="ui-display font-bold text-sm sm:text-base truncate"
        >
          ← Satoshi Monument {en ? "· Report" : "· Report"}
        </a>
        <a
          href="/api/report?download=1"
          className="ui-btn press px-3 py-1.5 text-sm whitespace-nowrap"
        >
          {en ? "Download PDF" : "Stáhnout PDF"}
        </a>
      </header>
      <iframe
        src="/api/report"
        title={en ? "Fundraiser report" : "Report sbírky"}
        className="flex-1 w-full border-0"
      />
    </div>
  );
}
