import { NextRequest, NextResponse } from "next/server";
import { saveWebp } from "@/lib/imageStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif"];

// Jednoduchý in-memory rate-limit (best-effort, per instance) proti spamu uploadů.
const hits = new Map<string, number[]>();
const WINDOW = 10 * 60 * 1000;
const LIMIT = 15;
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW);
  if (arr.length >= LIMIT) {
    hits.set(ip, arr);
    return true;
  }
  arr.push(now);
  hits.set(ip, arr);
  return false;
}

/**
 * Veřejný upload obrázku (logo skupiny) z formuláře. Bez přihlášení, ale:
 * - rate-limit per IP,
 * - re-enkódování přes sharp → malý webp (sanitizace + zmenšení),
 * - omezený typ a velikost.
 * Obrázek se ukáže na zdi až po potvrzení platby; admin ho může moderovat (skrýt).
 */
export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "no_file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }
  const type = (file as File).type || "";
  if (type && !ALLOWED.includes(type)) {
    return NextResponse.json({ error: "bad_type" }, { status: 415 });
  }

  const input = Buffer.from(await file.arrayBuffer());
  try {
    const url = await saveWebp(input);
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: "bad_image" }, { status: 422 });
  }
}
