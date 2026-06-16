import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getInvoiceStatus,
  getInvoiceBtcPaid,
  getInvoiceBtcPaidConfirmed,
} from "@/lib/btcpay";
import { timingSafeEq } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Záchranná síť pro BTCPay: webhook (InvoiceSettled) potvrzuje dary okamžitě,
 * ale když nedorazí (výpadek doručení, restart při deploy…), dar by zůstal
 * navždy „pending". Tento cron projde pending BTC dary s fakturou a doreconciliuje
 * je přímo dotazem na BTCPay — totožnou logikou jako webhook (idempotentní:
 * potvrzený dar už nepřepisuje, počítá SKUTEČNĚ přijatou částku).
 */
export async function GET(req: NextRequest) {
  const key = req.headers.get("x-cron-key") ?? "";
  if (!process.env.CRON_SECRET || !timingSafeEq(key, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Jen pending BTC dary s fakturou. Omezeno na rozumné okno (poslední 7 dní) —
  // starší nezaplacené faktury jsou dávno expirované a netřeba je opakovaně dotazovat.
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const pending = await prisma.donation.findMany({
    where: {
      status: "pending",
      currency: "BTC",
      btcpayInvoiceId: { not: null },
      createdAt: { gte: since },
    },
    select: { id: true, btcpayInvoiceId: true, amount: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const confirmed: Array<{ id: string; paid: number }> = [];
  const expired: string[] = [];
  const rejected: string[] = [];
  let checked = 0;
  let apiErrors = 0;

  for (const d of pending) {
    const invoiceId = d.btcpayInvoiceId!;
    const info = await getInvoiceStatus(invoiceId);
    if (!info) {
      apiErrors++;
      continue;
    }
    checked++;
    const { status } = info;

    if (status === "Settled") {
      // Plně zaplaceno → potvrdit skutečnou přijatou částkou (víc i míň).
      let paid = await getInvoiceBtcPaid(invoiceId);
      if (paid === 0) {
        await new Promise((r) => setTimeout(r, 2000));
        paid = await getInvoiceBtcPaid(invoiceId);
      }
      if (paid === 0) {
        console.warn(
          `btcpay-sync: Settled, ale getInvoiceBtcPaid=0 — confirm ${d.id} na požadovanou částku ${d.amount}; ověřit ručně.`,
        );
      }
      const actual = paid > 0 ? paid : d.amount;
      // Idempotence přes updateMany s podmínkou status:"pending" — pokud mezitím
      // webhook dar potvrdil, žádný řádek nezměníme (žádné dvojí započtení).
      const r = await prisma.donation.updateMany({
        where: { id: d.id, status: "pending" },
        data: {
          status: "confirmed",
          amount: actual,
          amountBtc: actual,
          confirmedAt: new Date(),
        },
      });
      if (r.count > 0) confirmed.push({ id: d.id, paid: actual });
      continue;
    }

    if (status === "Invalid") {
      const r = await prisma.donation.updateMany({
        where: { id: d.id, status: "pending" },
        data: { status: "rejected" },
      });
      if (r.count > 0) rejected.push(d.id);
      continue;
    }

    if (status === "Expired") {
      // Pozdě/částečně zaplaceno: počítáme jen POTVRZENÉ platby (0-conf ignorujeme).
      const confirmedPaid = await getInvoiceBtcPaidConfirmed(invoiceId);
      if (confirmedPaid > 0) {
        const r = await prisma.donation.updateMany({
          where: { id: d.id, status: "pending" },
          data: {
            status: "confirmed",
            amount: confirmedPaid,
            amountBtc: confirmedPaid,
            confirmedAt: new Date(),
          },
        });
        if (r.count > 0) confirmed.push({ id: d.id, paid: confirmedPaid });
      } else {
        const r = await prisma.donation.updateMany({
          where: { id: d.id, status: "pending" },
          data: { status: "expired" },
        });
        if (r.count > 0) expired.push(d.id);
      }
      continue;
    }

    // New / Processing → necháme pending (čeká na zaplacení / konfirmaci).
  }

  return NextResponse.json({
    ok: true,
    pending: pending.length,
    checked,
    apiErrors,
    confirmed,
    expired,
    rejected,
  });
}
