/**
 * Klient pro BTCPayServer Greenfield API.
 * Vytváření invoice + ověření podpisu webhooku.
 */

import crypto from "crypto";

const BTCPAY_URL = process.env.BTCPAY_URL ?? "";
const STORE_ID = process.env.BTCPAY_STORE_ID ?? "";
const API_KEY = process.env.BTCPAY_API_KEY ?? "";

export interface CreateInvoiceParams {
  amount: number;
  currency: string; // "CZK" | "BTC" | ...
  donationId: string;
  orderId?: string;
  buyerName?: string;
  publicMessage?: string;
  redirectUrl?: string;
}

export interface BtcpayInvoice {
  id: string;
  checkoutLink: string;
  status: string;
}

function assertConfigured() {
  if (!BTCPAY_URL || !STORE_ID || !API_KEY) {
    throw new Error(
      "BTCPay není nakonfigurován (BTCPAY_URL / BTCPAY_STORE_ID / BTCPAY_API_KEY).",
    );
  }
}

export async function createInvoice(
  params: CreateInvoiceParams,
): Promise<BtcpayInvoice> {
  assertConfigured();

  const body = {
    amount: params.amount,
    currency: params.currency,
    metadata: {
      orderId: params.orderId ?? params.donationId,
      donationId: params.donationId,
      buyerName: params.buyerName,
      itemDesc: "Příspěvek na sochu Satoshiho Nakamota",
      publicMessage: params.publicMessage,
    },
    checkout: {
      redirectURL: params.redirectUrl,
      redirectAutomatically: true,
    },
  };

  const res = await fetch(
    `${BTCPAY_URL}/api/v1/stores/${STORE_ID}/invoices`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `token ${API_KEY}`,
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`BTCPay create invoice selhalo (${res.status}): ${text}`);
  }

  const data = (await res.json()) as {
    id: string;
    checkoutLink: string;
    status: string;
  };
  return { id: data.id, checkoutLink: data.checkoutLink, status: data.status };
}

/** Detail invoice – použito pro načtení reálné BTC částky po settlement. */
export async function getInvoicePaymentMethods(invoiceId: string): Promise<
  Array<{ paymentMethod: string; amount: string; currency: string }>
> {
  assertConfigured();
  const res = await fetch(
    `${BTCPAY_URL}/api/v1/stores/${STORE_ID}/invoices/${invoiceId}/payment-methods`,
    { headers: { Authorization: `token ${API_KEY}` } },
  );
  if (!res.ok) return [];
  return (await res.json()) as Array<{
    paymentMethod: string;
    amount: string;
    currency: string;
  }>;
}

/**
 * Ověří HMAC-SHA256 podpis webhooku z hlavičky `BTCPay-Sig`.
 * Hlavička má tvar `sha256=<hex>`.
 */
export function verifyWebhookSignature(
  rawBody: string,
  sigHeader: string | null,
): boolean {
  const secret = process.env.BTCPAY_WEBHOOK_SECRET ?? "";
  if (!secret || !sigHeader) return false;

  const expected =
    "sha256=" +
    crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");

  const a = Buffer.from(sigHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
