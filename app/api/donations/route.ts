import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { createInvoice } from "@/lib/btcpay";
import { buildSpayd, makeVariableSymbol } from "@/lib/spayd";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

const MIN_CZK = 250; // minimální fiat příspěvek
const MAX_CZK = 5_000_000; // horní strop fiat příspěvku (sanity limit)
const MAX_BTC = 21; // horní strop BTC příspěvku (sanity limit)

const BANK_ACCOUNT = process.env.BANK_ACCOUNT ?? "";
const BANK_CODE = process.env.BANK_CODE ?? "";
const BANK_HOLDER = process.env.BANK_HOLDER ?? "";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Krátký, lidsky čitelný párovací kód do poznámky platby.
// Bez matoucích znaků (0/O/1/I), prefix SN = Satoshi Nakamoto.
function makePaymentRef(): string {
  const charset = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  const bytes = crypto.randomBytes(5);
  for (let i = 0; i < 5; i++) code += charset[bytes[i] % charset.length];
  return `SN-${code}`;
}

interface Body {
  name?: string;
  currency?: string; // "BTC" | "CZK"
  amount?: number;
  publicMessage?: string;
  privateMessage?: string;
  donorKey?: string; // identifikátor pro párování plateb
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const name = (body.name ?? "").trim().slice(0, 80) || "Anonym";
  const currency = body.currency === "BTC" ? "BTC" : "CZK";
  const amount = Number(body.amount);
  const publicMessage = (body.publicMessage ?? "").trim().slice(0, 280) || null;
  const privateMessage =
    (body.privateMessage ?? "").trim().slice(0, 1000) || null;
  // Párovací identifikátor: normalizovaný (trim + lowercase) pro spolehlivé párování.
  const donorKey =
    (body.donorKey ?? "").trim().toLowerCase().slice(0, 120) || null;

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
  }
  // Minimální fiat příspěvek + horní stropy (sanity proti spamu/přetečení).
  if (currency === "CZK" && (amount < MIN_CZK || amount > MAX_CZK)) {
    return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
  }
  if (currency === "BTC" && amount > MAX_BTC) {
    return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
  }

  // Vytvoříme záznam (pending) – ID použijeme pro orderId/variabilní symbol.
  const donation = await prisma.donation.create({
    data: {
      name,
      currency,
      amount,
      publicMessage,
      privateMessage,
      donorKey,
      status: "pending",
    },
  });

  if (currency === "BTC") {
    try {
      const invoice = await createInvoice({
        amount,
        currency: "BTC",
        donationId: donation.id,
        orderId: donation.id,
        buyerName: name,
        publicMessage: publicMessage ?? undefined,
        redirectUrl: SITE_URL,
      });

      await prisma.donation.update({
        where: { id: donation.id },
        data: { btcpayInvoiceId: invoice.id },
      });

      return NextResponse.json({
        method: "btc",
        donationId: donation.id,
        invoiceId: invoice.id,
        checkoutLink: invoice.checkoutLink,
        btcpayUrl: process.env.BTCPAY_URL,
      });
    } catch (err) {
      // invoice se nepovedlo – záznam zrušíme, ať nezůstává pending balast
      await prisma.donation.update({
        where: { id: donation.id },
        data: { status: "rejected" },
      });
      console.error("BTCPay invoice error:", err);
      return NextResponse.json({ error: "btcpay_failed" }, { status: 502 });
    }
  }

  // CZK – vygenerujeme SPAYD + QR.
  const variableSymbol = makeVariableSymbol(donation.id);
  const paymentRef = makePaymentRef();
  await prisma.donation.update({
    where: { id: donation.id },
    data: { variableSymbol, paymentRef },
  });

  // Párovací kód dáme na začátek poznámky, ať přežije případné oříznutí na 60 znaků.
  const messageForBank = `Dar ${paymentRef} - socha Satoshiho Nakamota`;

  const spayd = buildSpayd({
    account: BANK_ACCOUNT,
    bankCode: BANK_CODE,
    amount,
    message: messageForBank,
    variableSymbol,
    recipientName: BANK_HOLDER,
  });

  const qrDataUrl = await QRCode.toDataURL(spayd, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 320,
  });

  return NextResponse.json({
    method: "czk",
    donationId: donation.id,
    amount,
    variableSymbol,
    paymentRef,
    account: `${BANK_ACCOUNT}/${BANK_CODE}`,
    spayd,
    qrDataUrl,
  });
}
