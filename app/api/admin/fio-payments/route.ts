import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";
import { czkToBtc } from "@/lib/price";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // Nepárované nahoře, pak ostatní.
  const payments = await prisma.fioPayment.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
  });
  return NextResponse.json({ payments });
}

interface Body {
  id?: string;
  action?: "assign" | "ignore" | "unignore";
  vs?: string;
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

  const payment = body.id
    ? await prisma.fioPayment.findUnique({ where: { id: body.id } })
    : null;
  if (!payment) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (body.action === "ignore" || body.action === "unignore") {
    const updated = await prisma.fioPayment.update({
      where: { id: payment.id },
      data: { status: body.action === "ignore" ? "ignored" : "unmatched" },
    });
    return NextResponse.json({ ok: true, payment: updated });
  }

  if (body.action === "assign") {
    const vs = (body.vs ?? "").trim();
    if (!vs) {
      return NextResponse.json({ error: "missing_vs" }, { status: 400 });
    }
    // Najdeme čekající CZK dar podle zadaného VS (nebo párovacího kódu SN-).
    const donation = await prisma.donation.findFirst({
      where: {
        status: "pending",
        currency: "CZK",
        OR: [{ variableSymbol: vs }, { paymentRef: vs.toUpperCase() }],
      },
    });
    if (!donation) {
      return NextResponse.json({ error: "donation_not_found" }, { status: 404 });
    }

    const amountBtc = await czkToBtc(payment.amount);
    await prisma.donation.update({
      where: { id: donation.id },
      data: {
        status: "confirmed",
        amount: payment.amount,
        amountBtc,
        confirmedAt: new Date(),
      },
    });
    const updated = await prisma.fioPayment.update({
      where: { id: payment.id },
      data: { status: "matched", donationId: donation.id },
    });
    return NextResponse.json({ ok: true, payment: updated, donationId: donation.id });
  }

  return NextResponse.json({ error: "unknown_action" }, { status: 400 });
}
