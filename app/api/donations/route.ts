import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { createInvoice } from "@/lib/btcpay";
import { buildSpayd, makeVariableSymbol } from "@/lib/spayd";
import { normalizeDonorKey } from "@/lib/donorKey";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

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
  locale?: string; // pro redirect na děkovnou stránku
}

export async function POST(req: NextRequest) {
  // Sanity limit velikosti těla (proti zneužití multi-MB payloadem).
  const clen = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(clen) && clen > 100_000) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // Bezpečné přetypování — vstup z internetu může být cokoli (číslo/objekt/pole),
  // jinak by .trim() na ne-stringu shodil handler (500).
  const asStr = (v: unknown): string => (typeof v === "string" ? v : "");
  const name = asStr(body.name).trim().slice(0, 80) || "Anonym";
  const currency = body.currency === "BTC" ? "BTC" : "CZK";
  const amount =
    typeof body.amount === "number"
      ? body.amount
      : typeof body.amount === "string"
        ? Number(body.amount)
        : NaN;
  const publicMessage = asStr(body.publicMessage).trim().slice(0, 280) || null;
  const privateMessage =
    asStr(body.privateMessage).trim().slice(0, 1000) || null;
  // Párovací identifikátor: normalizovaný (trim + lowercase) pro spolehlivé párování.
  const donorKey = normalizeDonorKey(asStr(body.donorKey));
  const locale = body.locale === "en" ? "en" : "cs";

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
  }
  // Min není vymáhán (jen mez slideru); server hlídá jen horní strop (sanity).
  if (currency === "CZK" && amount > MAX_CZK) {
    return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
  }
  if (currency === "BTC" && amount > MAX_BTC) {
    return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
  }

  try {
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
        redirectUrl: `${SITE_URL}/${locale}/diky?amt=${amount}&cur=btc`,
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
        amount,
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
  } catch (err) {
    console.error("donation POST error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
