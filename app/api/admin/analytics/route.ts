import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const daysParam = Number(req.nextUrl.searchParams.get("days") ?? "30");
  const days = [7, 30, 90].includes(daysParam) ? daysParam : 30;
  const since = new Date(Date.now() - days * 24 * 3600 * 1000);

  const views = await prisma.pageView.findMany({
    where: { createdAt: { gte: since } },
    select: {
      createdAt: true,
      isBot: true,
      referrer: true,
      device: true,
      locale: true,
      visitorHash: true,
    },
  });

  const human = views.filter((v) => !v.isBot);
  const bots = views.filter((v) => v.isBot);

  // Denní řada
  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  const perDayMap = new Map<string, { views: number; bots: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 3600 * 1000);
    perDayMap.set(dayKey(d), { views: 0, bots: 0 });
  }
  for (const v of views) {
    const k = dayKey(v.createdAt);
    const slot = perDayMap.get(k);
    if (slot) v.isBot ? slot.bots++ : slot.views++;
  }
  const perDay = [...perDayMap.entries()].map(([day, s]) => ({ day, ...s }));

  // Unikátní návštěvníci (jen lidé)
  const uniqueVisitors = new Set(human.map((v) => v.visitorHash)).size;

  // Top zdroje
  const refCount = new Map<string, number>();
  for (const v of human) {
    const r = v.referrer || "direct";
    refCount.set(r, (refCount.get(r) ?? 0) + 1);
  }
  const topReferrers = [...refCount.entries()]
    .map(([referrer, count]) => ({ referrer, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const countBy = (arr: typeof human, key: "device" | "locale") => {
    const m = new Map<string, number>();
    for (const v of arr) {
      const k = (v[key] as string | null) ?? "—";
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return Object.fromEntries(m);
  };

  // Funnel z darů
  const donationsCreated = await prisma.donation.count({
    where: { createdAt: { gte: since } },
  });
  const donationsConfirmed = await prisma.donation.count({
    where: { status: "confirmed", confirmedAt: { gte: since } },
  });

  // Denní řada potvrzených příspěvků: počet + objem (sats) dle confirmedAt.
  const confirmedDonations = await prisma.donation.findMany({
    where: { status: "confirmed", confirmedAt: { gte: since } },
    select: { confirmedAt: true, amountBtc: true },
  });
  const donMap = new Map<string, { count: number; sats: number }>();
  for (let i = days - 1; i >= 0; i--) {
    donMap.set(dayKey(new Date(Date.now() - i * 24 * 3600 * 1000)), {
      count: 0,
      sats: 0,
    });
  }
  for (const dn of confirmedDonations) {
    if (!dn.confirmedAt) continue;
    const slot = donMap.get(dayKey(dn.confirmedAt));
    if (slot) {
      slot.count++;
      slot.sats += Math.round((dn.amountBtc ?? 0) * 1e8);
    }
  }
  const donationsPerDay = [...donMap.entries()].map(([day, s]) => ({
    day,
    count: s.count,
    sats: s.sats,
  }));

  return NextResponse.json({
    days,
    humanViews: human.length,
    botViews: bots.length,
    uniqueVisitors,
    perDay,
    donationsPerDay,
    topReferrers,
    device: countBy(human, "device"),
    locale: countBy(human, "locale"),
    funnel: {
      visitors: uniqueVisitors,
      created: donationsCreated,
      confirmed: donationsConfirmed,
    },
  });
}
