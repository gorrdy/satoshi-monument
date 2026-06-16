import { NextResponse } from "next/server";
import { getRoadmap } from "@/lib/roadmap";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await getRoadmap();
  return NextResponse.json(
    { items },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    },
  );
}
