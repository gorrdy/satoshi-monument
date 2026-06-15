import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";
import { normalizeDonorKey } from "@/lib/donorKey";

export const dynamic = "force-dynamic";

/** Přehled profilů identifikátorů + reálně použité donorKeys z plateb. */
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const profiles = await prisma.donorProfile.findMany({
    orderBy: { updatedAt: "desc" },
  });

  // Identifikátory reálně použité na platbách (pro nabídku v adminu).
  const rows = await prisma.donation.findMany({
    where: { donorKey: { not: null } },
    select: { donorKey: true, name: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  const keyMap = new Map<string, { count: number; lastName: string }>();
  for (const r of rows) {
    const k = r.donorKey!;
    const e = keyMap.get(k);
    if (e) e.count++;
    else keyMap.set(k, { count: 1, lastName: r.name });
  }
  const keys = [...keyMap.entries()]
    .map(([donorKey, v]) => ({ donorKey, count: v.count, lastName: v.lastName }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({ profiles, keys });
}

/** Vytvoření/úprava (save) nebo smazání (delete) profilu identifikátoru. */
export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const action = body.action as string;
  const donorKey = normalizeDonorKey(body.donorKey);
  if (!donorKey) {
    return NextResponse.json({ error: "missing_donorKey" }, { status: 400 });
  }

  if (action === "delete") {
    await prisma.donorProfile.deleteMany({ where: { donorKey } });
    return NextResponse.json({ ok: true });
  }

  // save
  const name = (body.name ?? "").trim().slice(0, 80);
  if (!name) {
    return NextResponse.json({ error: "missing_name" }, { status: 400 });
  }
  const rawUrl = (body.imageUrl ?? "").trim().slice(0, 500);
  const imageUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : null;
  const rawBg = (body.imageBg ?? "").trim();
  const imageBg = /^#[0-9a-fA-F]{3,8}$/.test(rawBg) ? rawBg : null;

  const profile = await prisma.donorProfile.upsert({
    where: { donorKey },
    create: { donorKey, name, imageUrl, imageBg },
    update: { name, imageUrl, imageBg },
  });

  return NextResponse.json({ ok: true, profile });
}
