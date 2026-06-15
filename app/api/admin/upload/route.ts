import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { saveWebp } from "@/lib/imageStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];

/** Upload obrázku (logo/avatar) z disku. Re-enkóduje přes sharp → webp (sanitizace + optimalizace). */
export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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
    // Re-enkódování přes sharp zahodí případný škodlivý obsah (vč. SVG skriptů),
    // sjednotí formát a zmenší na ~256 px (na stránce se reálně načte jen pár kB).
    const url = await saveWebp(input);
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: "bad_image" }, { status: 422 });
  }
}
