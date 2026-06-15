import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";
import { czkToBtc } from "@/lib/price";
import { normalizeDonorKey } from "@/lib/donorKey";
import { resolveImageUrl } from "@/lib/imageStore";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const status = req.nextUrl.searchParams.get("status"); // pending | confirmed | rejected | all
  const where = status && status !== "all" ? { status } : {};

  const [donations, grouped] = await Promise.all([
    prisma.donation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.donation.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  // Počty podle stavu (pro přehled v adminu).
  const counts: Record<string, number> = { all: 0 };
  for (const g of grouped) {
    counts[g.status] = g._count._all;
    counts.all += g._count._all;
  }

  return NextResponse.json({ donations, counts });
}

interface ActionBody {
  id?: string;
  action?:
    | "confirm"
    | "reject"
    | "hide"
    | "unhide"
    | "setKey"
    | "edit"
    | "setPurchased";
  donorKey?: string;
  name?: string;
  publicMessage?: string;
  imageUrl?: string;
  imageBg?: string;
  purchased?: boolean;
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: ActionBody;
  try {
    body = (await req.json()) as ActionBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { id, action } = body;
  if (!id || !action) {
    return NextResponse.json({ error: "missing_params" }, { status: 400 });
  }

  const donation = await prisma.donation.findUnique({ where: { id } });
  if (!donation) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (action === "confirm") {
    // Guard: už potvrzený dar znovu nepřepisujeme — re-confirm CZK by přepočítal
    // amountBtc z původní user částky a přepsal reálně zreconciliovanou hodnotu (Fio).
    if (donation.status === "confirmed") {
      return NextResponse.json({ ok: true, alreadyConfirmed: true, donation });
    }
    const amountBtc =
      donation.currency === "BTC"
        ? donation.amount
        : await czkToBtc(donation.amount);

    const updated = await prisma.donation.update({
      where: { id },
      data: { status: "confirmed", amountBtc, confirmedAt: new Date() },
    });
    return NextResponse.json({ ok: true, donation: updated });
  }

  if (action === "reject") {
    // Zamítnutí už potvrzeného daru odečte částku z totálu — zalogovat pro audit.
    if (donation.status === "confirmed") {
      console.warn(
        `admin reject POTVRZENÉHO daru ${donation.id} (${donation.amountBtc} BTC) — odečte se z veřejného součtu.`,
      );
    }
    const updated = await prisma.donation.update({
      where: { id },
      data: { status: "rejected" },
    });
    return NextResponse.json({ ok: true, donation: updated });
  }

  if (action === "hide" || action === "unhide") {
    const updated = await prisma.donation.update({
      where: { id },
      data: { hiddenOnWall: action === "hide" },
    });
    return NextResponse.json({ ok: true, donation: updated });
  }

  if (action === "setKey") {
    const donorKey = normalizeDonorKey(body.donorKey);
    const updated = await prisma.donation.update({
      where: { id },
      data: { donorKey },
    });
    return NextResponse.json({ ok: true, donation: updated });
  }

  if (action === "setPurchased") {
    const updated = await prisma.donation.update({
      where: { id },
      data: { btcPurchased: body.purchased === true },
    });
    return NextResponse.json({ ok: true, donation: updated });
  }

  if (action === "edit") {
    const data: {
      name?: string;
      publicMessage?: string | null;
      imageUrl?: string | null;
      imageBg?: string | null;
    } = {};
    if (typeof body.name === "string") {
      data.name = body.name.trim().slice(0, 80) || "Anonym";
    }
    if (typeof body.publicMessage === "string") {
      data.publicMessage = body.publicMessage.trim().slice(0, 280) || null;
    }
    if (typeof body.imageUrl === "string") {
      // Externí URL se stáhne a uloží jako malý lokální webp; lokální se ponechá.
      data.imageUrl = await resolveImageUrl(body.imageUrl);
    }
    if (typeof body.imageBg === "string") {
      const c = body.imageBg.trim();
      // Jen platný hex (#rgb / #rrggbb), jinak null (= výchozí bílá).
      data.imageBg = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c) ? c : null;
    }
    const updated = await prisma.donation.update({ where: { id }, data });
    return NextResponse.json({ ok: true, donation: updated });
  }

  return NextResponse.json({ error: "unknown_action" }, { status: 400 });
}
