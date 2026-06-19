import { NextResponse } from "next/server";
import { getStatsBundle } from "@/lib/stats";

export const dynamic = "force-dynamic";

export async function GET() {
  // Krátká in-process cache (lib/stats) — bez recompute ze SQLite při každém pollu.
  const { stats, wall, recent, pending, close } = await getStatsBundle();
  return NextResponse.json(
    { stats, wall, recent, pending, close },
    {
      headers: {
        // Krátká cache na okraji (nginx/CDN) ke koalescenci náporu; data zůstávají čerstvá.
        "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
      },
    },
  );
}
