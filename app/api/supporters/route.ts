import { NextResponse } from "next/server";
import { getStatsBundle, KIND_SUPPORTERS } from "@/lib/stats";

export const dynamic = "force-dynamic";

// Veřejná data Zdi Podporovatelů (průběžná sbírka na pojištění/údržbu/péči).
export async function GET() {
  const { stats, wall, recent, pending } = await getStatsBundle(KIND_SUPPORTERS);
  return NextResponse.json(
    { stats, wall, recent, pending },
    {
      headers: {
        "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
      },
    },
  );
}
