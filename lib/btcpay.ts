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
      signal: AbortSignal.timeout(10000),
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

/** Stav invoice (New / Processing / Settled / Expired / Invalid). null při chybě API. */
export async function getInvoiceStatus(
  invoiceId: string,
): Promise<{ status: string; additionalStatus?: string } | null> {
  assertConfigured();
  try {
    const res = await fetch(
      `${BTCPAY_URL}/api/v1/stores/${STORE_ID}/invoices/${invoiceId}`,
      {
        headers: { Authorization: `token ${API_KEY}` },
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!res.ok) return null;
    const d = (await res.json()) as {
      status?: string;
      additionalStatus?: string;
    };
    return { status: d.status ?? "", additionalStatus: d.additionalStatus };
  } catch {
    return null;
  }
}

/**
 * ID faktur, které mají nějakou platbu (potvrzenou / pozdní / částečnou / přeplacenou),
 * vytvořené od daného času. Stránkovaný list endpoint — levné předfiltrování, ať se
 * per-invoice payment-methods volá jen pro faktury, které reálně něco přijaly.
 */
export async function getPaidInvoiceIdsSince(
  sinceMs: number,
): Promise<Set<string>> {
  assertConfigured();
  const ids = new Set<string>();
  const startDate = Math.floor(sinceMs / 1000);
  for (let skip = 0; skip < 5000; skip += 100) {
    let arr: Array<{
      id?: string;
      status?: string;
      additionalStatus?: string;
      paidAmount?: string;
    }>;
    try {
      const res = await fetch(
        `${BTCPAY_URL}/api/v1/stores/${STORE_ID}/invoices?startDate=${startDate}&take=100&skip=${skip}`,
        {
          headers: { Authorization: `token ${API_KEY}` },
          signal: AbortSignal.timeout(15000),
        },
      );
      if (!res.ok) break;
      arr = await res.json();
    } catch {
      break;
    }
    if (!Array.isArray(arr) || arr.length === 0) break;
    for (const inv of arr) {
      const paidish =
        inv.status === "Settled" ||
        ["PaidLate", "PaidPartial", "PaidOver"].includes(
          inv.additionalStatus ?? "",
        ) ||
        Number(inv.paidAmount ?? "0") > 0;
      if (paidish && inv.id) ids.add(inv.id);
    }
    if (arr.length < 100) break;
  }
  return ids;
}

/** Detail invoice – použito pro načtení reálné BTC částky po settlement. */
export async function getInvoicePaymentMethods(invoiceId: string): Promise<
  Array<{ paymentMethodId: string; amount: string; currency: string }>
> {
  assertConfigured();
  const res = await fetch(
    `${BTCPAY_URL}/api/v1/stores/${STORE_ID}/invoices/${invoiceId}/payment-methods`,
    {
      headers: { Authorization: `token ${API_KEY}` },
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!res.ok) return [];
  return (await res.json()) as Array<{
    paymentMethodId: string;
    amount: string;
    currency: string;
  }>;
}

/** Skutečně přijatá BTC částka na invoici (součet zaplaceného přes BTC metody). */
export async function getInvoiceBtcPaid(invoiceId: string): Promise<number> {
  assertConfigured();
  try {
    const res = await fetch(
      `${BTCPAY_URL}/api/v1/stores/${STORE_ID}/invoices/${invoiceId}/payment-methods`,
      {
        headers: { Authorization: `token ${API_KEY}` },
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!res.ok) return 0;
    const pms = (await res.json()) as Array<{
      paymentMethodId?: string;
      paymentMethodPaid?: string;
    }>;
    let paid = 0;
    for (const pm of pms) {
      // BTCPay Greenfield vrací paymentMethodId "BTC-CHAIN" / "BTC-LN" / "BTC-LNURL"
      // (ne cryptoCode/paymentMethod).
      const code = (pm.paymentMethodId ?? "").toUpperCase();
      if (!code.includes("BTC")) continue;
      const v = Number(pm.paymentMethodPaid ?? "0");
      if (Number.isFinite(v)) paid += v;
    }
    return paid;
  } catch {
    return 0;
  }
}

/**
 * Jako getInvoiceBtcPaid, ale počítá JEN potvrzené platby (status "Settled").
 * Nepotvrzené (0-conf) platby ignoruje → ochrana proti započtení částky,
 * která může být ještě nahrazena (double-spend / RBF).
 */
export async function getInvoiceBtcPaidConfirmed(
  invoiceId: string,
): Promise<number> {
  assertConfigured();
  try {
    const res = await fetch(
      `${BTCPAY_URL}/api/v1/stores/${STORE_ID}/invoices/${invoiceId}/payment-methods`,
      {
        headers: { Authorization: `token ${API_KEY}` },
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!res.ok) return 0;
    const pms = (await res.json()) as Array<{
      paymentMethodId?: string;
      payments?: Array<{ value?: string; status?: string }>;
    }>;
    let paid = 0;
    for (const pm of pms) {
      const code = (pm.paymentMethodId ?? "").toUpperCase();
      if (!code.includes("BTC")) continue;
      for (const p of pm.payments ?? []) {
        if ((p.status ?? "") !== "Settled") continue; // jen potvrzené
        const v = Number(p.value ?? "0");
        if (Number.isFinite(v)) paid += v;
      }
    }
    return paid;
  } catch {
    return 0;
  }
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
