import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getCampaignClose, setCampaignClose } from "@/lib/settings";
import { getStats, KIND_MONUMENT } from "@/lib/stats";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ close: await getCampaignClose() });
}

interface Body {
  action?: "close" | "reopen";
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (body.action === "close") {
    // Zafixujeme aktuální (živý) stav hlavní sbírky jako konečný snapshot.
    const stats = await getStats(KIND_MONUMENT);
    await setCampaignClose({
      closed: true,
      closedAt: new Date().toISOString(),
      raisedBtc: stats.raisedBtc,
      donorCount: stats.donorCount,
    });
    return NextResponse.json({ ok: true, close: await getCampaignClose() });
  }

  if (body.action === "reopen") {
    await setCampaignClose({
      closed: false,
      closedAt: null,
      raisedBtc: 0,
      donorCount: 0,
    });
    return NextResponse.json({ ok: true, close: await getCampaignClose() });
  }

  return NextResponse.json({ error: "unknown_action" }, { status: 400 });
}
