import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

// PDF report generuje hodinový cron (scripts/generate-report.mjs) do REPORT_DIR.
const REPORT_PDF = path.join(
  process.env.REPORT_DIR || "/home/ubuntu/monument-data/report",
  "report.pdf",
);

export async function GET(req: NextRequest) {
  try {
    const buf = await readFile(REPORT_PDF);
    const download = req.nextUrl.searchParams.get("download") === "1";
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="satoshi-monument-report.pdf"`,
        // Krátká cache — report se generuje jednou za hodinu.
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch {
    return NextResponse.json({ error: "report_not_ready" }, { status: 404 });
  }
}
