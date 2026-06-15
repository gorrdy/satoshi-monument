import { NextResponse } from "next/server";
import { getWallItems } from "@/lib/stats";

export const dynamic = "force-dynamic";

/**
 * Lazy detail veřejné zdi: rozpis příspěvků jedné skupiny podle jejího
 * veřejného (soleného) id. Vstup je salted id — neprozrazuje donorKey/e-mail.
 * GET /api/wall/items?id=<16 hex>
 */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^[a-f0-9]{16}$/.test(id)) {
    return NextResponse.json({ error: "bad_id" }, { status: 400 });
  }
  const items = await getWallItems(id);
  if (!items) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json(
    { items },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } },
  );
}
