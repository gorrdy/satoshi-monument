import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";
import { isAuthenticated } from "@/lib/auth";

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
  let out: Buffer;
  try {
    // Re-enkódování přes sharp zahodí případný škodlivý obsah (vč. SVG skriptů)
    // a sjednotí formát; logo/avatar nepotřebuje víc než ~512 px.
    out = await sharp(input, { density: 200 })
      .resize(512, 512, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    return NextResponse.json({ error: "bad_image" }, { status: 422 });
  }

  const name = `${crypto.randomBytes(8).toString("hex")}.webp`;
  // Mimo public/ — `next start` runtime-přidané public soubory neservíruje.
  // Servíruje se přes GET /api/uploads/[name].
  const dir = path.join(process.cwd(), "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), out);

  return NextResponse.json({ url: `/api/uploads/${name}` });
}
