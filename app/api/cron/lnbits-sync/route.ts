import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { timingSafeEq } from "@/lib/auth";
import { lnbitsRecentSettled, lnbitsAllSettled } from "@/lib/lnbits";

export const dynamic = "force-dynamic";

const SATS = 1e8;

/**
 * Záchranná síť pro LN platby, které BTCPay nezaregistroval (MPP desync) →
 * dar zůstal „expired"/„pending" a nezapočítal se. LNbits (LN backend) je ale
 * zdroj pravdy: projdeme poslední ÚSPĚŠNÉ příchozí platby, podle Order ID v memo
 * je namapujeme na dary a nepotvrzené potvrdíme skutečně přijatou částkou.
 * Idempotentní (updateMany jen pro status pending/expired).
 */
export async function GET(req: NextRequest) {
  const key = req.headers.get("x-cron-key") ?? "";
  if (!process.env.CRON_SECRET || !timingSafeEq(key, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // ?deep=1 → projde celou historii (denní pojistka); jinak rychlé okno 300 (à 10 min).
  const deep = req.nextUrl.searchParams.get("deep") === "1";
  const settled = deep ? await lnbitsAllSettled() : await lnbitsRecentSettled(300);
  const recovered: Array<{ id: string; sats: number }> = [];

  for (const s of settled) {
    if (!s.orderId || s.sats <= 0) continue;
    const btc = s.sats / SATS;
    // Jen BTC dary, které u nás zatím nejsou potvrzené (desync). Idempotentní:
    // potvrzený dar (přes webhook) má status "confirmed" → updateMany ho nechá být.
    const r = await prisma.donation.updateMany({
      where: { id: s.orderId, currency: "BTC", status: { in: ["expired", "pending"] } },
      data: {
        status: "confirmed",
        amount: btc,
        amountBtc: btc,
        confirmedAt: new Date(),
      },
    });
    if (r.count > 0) recovered.push({ id: s.orderId, sats: s.sats });
  }

  return NextResponse.json({ ok: true, deep, checked: settled.length, recovered });
}
