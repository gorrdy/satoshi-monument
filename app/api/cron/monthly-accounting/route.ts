import { NextRequest, NextResponse } from "next/server";
import { timingSafeEq } from "@/lib/auth";
import { buildContributionsCsv, lastCompletedMonth } from "@/lib/accountingExport";
import { sendMonthlyAccounting, ACCOUNTING_EMAIL } from "@/lib/mail";

export const dynamic = "force-dynamic";

/**
 * Měsíční účetní e-mail — spouští systemd 1. dne v měsíci. Sestaví CSV výpis
 * příspěvků za MINULÝ (dokončený) měsíc a pošle ho účetní.
 * ?month=YYYY-MM přebije období (pro ruční test). ?dry=1 jen sestaví, neodešle.
 */
export async function GET(req: NextRequest) {
  const key = req.headers.get("x-cron-key") ?? "";
  if (!process.env.CRON_SECRET || !timingSafeEq(key, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const month = req.nextUrl.searchParams.get("month") ?? lastCompletedMonth();
  const dry = req.nextUrl.searchParams.get("dry") === "1";

  const built = await buildContributionsCsv(month);
  if (dry) {
    return NextResponse.json({
      ok: true, dry: true, month: built.month, count: built.count,
      sumCzkValue: Math.round(built.sumCzkValue), to: ACCOUNTING_EMAIL,
    });
  }

  const sent = await sendMonthlyAccounting(built);
  return NextResponse.json({
    ok: sent, month: built.month, count: built.count,
    sumCzkValue: Math.round(built.sumCzkValue), to: sent ? ACCOUNTING_EMAIL : null,
  });
}
