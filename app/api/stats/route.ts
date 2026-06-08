import { NextResponse } from "next/server";
import { getStats, getWall } from "@/lib/stats";

export const dynamic = "force-dynamic";

export async function GET() {
  const [stats, wall] = await Promise.all([getStats(), getWall()]);
  return NextResponse.json(
    { stats, wall },
    {
      headers: {
        // Krátká cache na okraji (nginx/CDN) ke koalescenci náporu; data zůstávají čerstvá.
        "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
      },
    },
  );
}
