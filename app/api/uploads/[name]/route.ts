import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Veřejné servírování nahraných obrázků (logo/avatar) z dir `uploads/`. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  // Jen náš formát názvu (hex.webp) — žádný path traversal.
  if (!/^[a-f0-9]{16}\.webp$/.test(name)) {
    return new NextResponse("not found", { status: 404 });
  }
  try {
    const dir = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
    const buf = await readFile(path.join(dir, name));
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("not found", { status: 404 });
  }
}
