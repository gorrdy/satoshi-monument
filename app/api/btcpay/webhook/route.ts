import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyWebhookSignature,
  getInvoiceBtcPaid,
  getInvoiceBtcPaidConfirmed,
} from "@/lib/btcpay";

export const dynamic = "force-dynamic";

interface WebhookPayload {
  type?: string;
  invoiceId?: string;
  metadata?: { donationId?: string };
  partiallyPaid?: boolean;
  afterExpiration?: boolean;
  overPaid?: boolean;
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

  const type = payload.type ?? "";
  // POZOR: jen "InvoiceSettled" = faktura plně zaplacená a zúčtovaná.
  // "InvoicePaymentSettled" přijde i při potvrzení DÍLČÍ (částečné) platby →
  // nesmí se brát jako plné zúčtování (jinak by se připsala celá požadovaná částka).
  // Settled → potvrdit. Expired/Invalid → vyřešit níže.
  // Created / ReceivedPayment / Processing / PaymentSettled → jen ack (necháme pending).
  const isSettled = type === "InvoiceSettled";
  const isExpired = type === "InvoiceExpired";
  const isInvalid = type === "InvoiceInvalid";

  if (!isSettled && !isExpired && !isInvalid) {
    return NextResponse.json({ ok: true, ignored: type });
  }

  const donation = await prisma.donation.findFirst({
    where: payload.invoiceId
      ? { btcpayInvoiceId: payload.invoiceId }
      : { id: payload.metadata?.donationId },
  });
  if (!donation) {
    return NextResponse.json({ ok: true, notFound: true });
  }
  // Potvrzený dar už nepřepisujeme (např. pozdní událost po settled).
  if (donation.status === "confirmed") {
    return NextResponse.json({ ok: true, alreadyConfirmed: true });
  }

  const invoiceId = donation.btcpayInvoiceId ?? payload.invoiceId ?? "";

  // Neplatná invoice (double-spend / ručně označená) → zamítnout, nezapočítávat.
  if (isInvalid) {
    await prisma.donation.update({
      where: { id: donation.id },
      data: { status: "rejected" },
    });
    return NextResponse.json({ ok: true, rejected: true });
  }

  // Kolik reálně přišlo (počítá i pozdní / částečné / přeplacené platby).
  let paid = invoiceId ? await getInvoiceBtcPaid(invoiceId) : 0;
  // V okamžiku settlementu může endpoint payment-methods chvíli vracet 0 →
  // krátký retry, ať nezapíšeme jen požadovanou částku místo skutečné.
  if (paid === 0 && isSettled && invoiceId) {
    await new Promise((r) => setTimeout(r, 2000));
    paid = await getInvoiceBtcPaid(invoiceId);
  }

  if (isSettled) {
    // Plně zaplaceno / přeplaceno → započítat SKUTEČNĚ přijatou částku
    // (víc i míň), ne požadovanou. Fallback na požadovanou jen když selže API
    // (settled = BTCPay považuje za plně zaplacené), ale hlasitě zalogovat.
    if (paid === 0) {
      console.warn(
        `BTCPay InvoiceSettled, ale getInvoiceBtcPaid=0 (API výpadek?) — confirm ${donation.id} na POŽADOVANOU částku ${donation.amount}; ověřit ručně.`,
      );
    }
    const actual = paid > 0 ? paid : donation.amount;
    await prisma.donation.update({
      where: { id: donation.id },
      data: {
        status: "confirmed",
        amount: actual, // BTC platba → amount je v BTC; admin ukáže reálnou částku
        amountBtc: actual,
        confirmedAt: new Date(),
      },
    });
    return NextResponse.json({ ok: true, confirmed: true, paid });
  }

  // isExpired: započítáme jen POTVRZENÉ platby (0-conf ignorujeme — mohly by být
  // ještě nahrazené double-spendem). Plně & pozdě zaplacené řeší větev isSettled.
  const confirmedPaid = invoiceId
    ? await getInvoiceBtcPaidConfirmed(invoiceId)
    : 0;
  if (confirmedPaid > 0) {
    await prisma.donation.update({
      where: { id: donation.id },
      data: {
        status: "confirmed",
        amount: confirmedPaid,
        amountBtc: confirmedPaid,
        confirmedAt: new Date(),
      },
    });
    return NextResponse.json({ ok: true, confirmedPartial: true, confirmedPaid });
  }

  await prisma.donation.update({
    where: { id: donation.id },
    data: { status: "expired" },
  });
  return NextResponse.json({ ok: true, expired: true });
}
