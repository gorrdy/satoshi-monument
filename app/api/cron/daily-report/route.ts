import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendDailyReport, type DailyReport } from "@/lib/mail";
import { getStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

const WINDOW_HOURS = 24;

export async function GET(req: NextRequest) {
  const key =
    req.nextUrl.searchParams.get("key") ?? req.headers.get("x-cron-key");
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const since = new Date(Date.now() - WINDOW_HOURS * 3600 * 1000);

  // Prošlo = potvrzeno v okně.
  const confirmed = await prisma.donation.findMany({
    where: { status: "confirmed", confirmedAt: { gte: since } },
    select: { currency: true, amount: true, amountBtc: true },
  });
  const confirmedBtcCount = confirmed.filter((d) => d.currency === "BTC").length;
  const confirmedCzkCount = confirmed.filter((d) => d.currency === "CZK").length;
  const sumBtc = confirmed.reduce((s, d) => s + (d.amountBtc ?? 0), 0);
  const sumCzk = confirmed
    .filter((d) => d.currency === "CZK")
    .reduce((s, d) => s + d.amount, 0);

  // Nové / neprošlo / čeká — podle vzniku v okně.
  const created = await prisma.donation.findMany({
    where: { createdAt: { gte: since } },
    select: { status: true },
  });
  const expired = created.filter((d) => d.status === "expired").length;
  const rejected = created.filter((d) => d.status === "rejected").length;
  const pending = created.filter((d) => d.status === "pending").length;

  // Nepárované příchozí Fio platby k vyřízení.
  const unmatchedFio = await prisma.fioPayment.findMany({
    where: { status: "unmatched" },
    select: { amount: true },
  });
  const unmatchedFioSumCzk = unmatchedFio.reduce((s, p) => s + p.amount, 0);

  const stats = await getStats();

  const report: DailyReport = {
    windowHours: WINDOW_HOURS,
    newTotal: created.length,
    confirmedTotal: confirmed.length,
    confirmedBtcCount,
    confirmedCzkCount,
    sumBtc,
    sumCzk,
    failedTotal: expired + rejected,
    expired,
    rejected,
    pending,
    unmatchedFioCount: unmatchedFio.length,
    unmatchedFioSumCzk,
    allTimeRaisedBtc: stats.raisedBtc,
    allTimeDonors: stats.donorCount,
    goalBtc: stats.goalBtc,
  };

  const sent = await sendDailyReport(report);
  return NextResponse.json({ ok: true, sent, report });
}
