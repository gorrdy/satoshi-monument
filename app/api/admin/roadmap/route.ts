import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

const STATUSES = ["done", "current", "upcoming"];

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const items = await prisma.roadmapItem.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const action = body.action as string;

  if (action === "add") {
    const max = await prisma.roadmapItem.aggregate({ _max: { order: true } });
    const item = await prisma.roadmapItem.create({
      data: {
        title: (body.title ?? "Nový bod").toString().trim().slice(0, 120) || "Nový bod",
        status: "upcoming",
        order: (max._max.order ?? 0) + 1,
      },
    });
    return NextResponse.json({ ok: true, item });
  }

  if (action === "save") {
    const id = String(body.id ?? "");
    if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    const status = STATUSES.includes(body.status) ? body.status : "upcoming";
    await prisma.roadmapItem.update({
      where: { id },
      data: {
        title: (body.title ?? "").toString().trim().slice(0, 120) || "—",
        detail: (body.detail ?? "").toString().trim().slice(0, 500) || null,
        dateLabel: (body.dateLabel ?? "").toString().trim().slice(0, 60) || null,
        status,
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "delete") {
    await prisma.roadmapItem.deleteMany({ where: { id: String(body.id ?? "") } });
    return NextResponse.json({ ok: true });
  }

  if (action === "move") {
    // Prohození pořadí se sousedem (nahoru/dolů).
    const id = String(body.id ?? "");
    const dir = body.dir === "up" ? "up" : "down";
    const all = await prisma.roadmapItem.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    const idx = all.findIndex((x) => x.id === id);
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (idx >= 0 && swapIdx >= 0 && swapIdx < all.length) {
      const a = all[idx];
      const b = all[swapIdx];
      await prisma.$transaction([
        prisma.roadmapItem.update({ where: { id: a.id }, data: { order: b.order } }),
        prisma.roadmapItem.update({ where: { id: b.id }, data: { order: a.order } }),
      ]);
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown_action" }, { status: 400 });
}
