import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

const BUCKET_MS = 15 * 60 * 1000; // čtvrthodina

/**
 * Potvrzené příspěvky bucketované po 15 min za zvolené okno (24/48/168 h).
 * Vrací { hours, buckets: [{ t, count, sats }] } — pro dvouosý graf v adminu.
 */
export async function GET(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const h = Number(req.nextUrl.searchParams.get("hours") ?? "24");
  const hours = [24, 48, 168].includes(h) ? h : 24;
  const nBuckets = hours * 4;
  const end = Math.ceil(Date.now() / BUCKET_MS) * BUCKET_MS;
  const startMs = end - nBuckets * BUCKET_MS;

  const rows = await prisma.donation.findMany({
    where: { status: "confirmed", confirmedAt: { gte: new Date(startMs) } },
    select: { confirmedAt: true, amountBtc: true },
  });

  const buckets = Array.from({ length: nBuckets }, (_, i) => ({
    t: new Date(startMs + i * BUCKET_MS).toISOString(),
    count: 0,
    sats: 0,
  }));
  for (const d of rows) {
    if (!d.confirmedAt) continue;
    const idx = Math.floor((d.confirmedAt.getTime() - startMs) / BUCKET_MS);
    if (idx >= 0 && idx < nBuckets) {
      buckets[idx].count++;
      buckets[idx].sats += Math.round((d.amountBtc ?? 0) * 1e8);
    }
  }

  return NextResponse.json({ hours, buckets });
}
