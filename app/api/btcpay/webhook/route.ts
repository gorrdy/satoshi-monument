import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature } from "@/lib/btcpay";

export const dynamic = "force-dynamic";

interface WebhookPayload {
  type?: string;
  invoiceId?: string;
  metadata?: { donationId?: string };
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig = req.headers.get("BTCPay-Sig");

  if (!verifyWebhookSignature(raw, sig)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(raw) as WebhookPayload;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const SETTLED = ["InvoiceSettled", "InvoicePaymentSettled"];
  const EXPIRED = ["InvoiceExpired", "InvoiceInvalid"];
  const isSettled = SETTLED.includes(payload.type ?? "");
  const isExpired = EXPIRED.includes(payload.type ?? "");

  if (!isSettled && !isExpired) {
    return NextResponse.json({ ok: true, ignored: payload.type });
  }

  // Najdeme dar podle invoiceId (případně podle metadata.donationId).
  const donation = await prisma.donation.findFirst({
    where: payload.invoiceId
      ? { btcpayInvoiceId: payload.invoiceId }
      : { id: payload.metadata?.donationId },
  });

  if (!donation) {
    return NextResponse.json({ ok: true, notFound: true });
  }

  // Potvrzený dar už nepřepisujeme (např. pozdní expired po settled).
  if (donation.status === "confirmed") {
    return NextResponse.json({ ok: true, alreadyConfirmed: true });
  }

  if (isExpired) {
    await prisma.donation.update({
      where: { id: donation.id },
      data: { status: "expired" },
    });
    return NextResponse.json({ ok: true, expired: true });
  }

  // Settled: invoice je denominovaná v BTC, takže částka = BTC ekvivalent.
  await prisma.donation.update({
    where: { id: donation.id },
    data: {
      status: "confirmed",
      amountBtc: donation.currency === "BTC" ? donation.amount : donation.amountBtc,
      confirmedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
