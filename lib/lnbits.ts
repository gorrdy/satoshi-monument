/**
 * LNbits (LN backend, lnbits.cz) — čtení stavu plateb pro reconciliaci.
 * BTCPay občas LN platbu nezaregistruje (MPP desync) → dar zůstane „expired".
 * LNbits je ale zdroj pravdy: tady ověříme, že platba reálně dorazila.
 */
const URL = process.env.LNBITS_URL ?? "";
const KEY = process.env.LNBITS_READ_KEY ?? "";

export interface LnbitsSettled {
  orderId: string; // donationId z memo „… (Order ID: X)"
  hash: string;
  sats: number;
}

/** Jedna platba dle payment hash — {paid, sats} nebo null při chybě. */
export async function lnbitsPaymentPaid(
  hash: string,
): Promise<{ paid: boolean; sats: number } | null> {
  if (!URL || !KEY) return null;
  try {
    const r = await fetch(`${URL}/api/v1/payments/${hash}`, {
      headers: { "X-Api-Key": KEY },
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return null;
    const d = (await r.json()) as {
      paid?: boolean;
      status?: string;
      details?: { amount?: number };
    };
    const paid = d.paid === true || d.status === "success";
    const sats = Math.round(Math.abs(d.details?.amount ?? 0) / 1000);
    return { paid, sats };
  } catch {
    return null;
  }
}

/**
 * Poslední ÚSPĚŠNÉ příchozí platby s naším Order ID (z memo).
 * Pro hromadnou reconciliaci — namapování na dary podle donationId.
 */
export async function lnbitsRecentSettled(
  limit = 200,
): Promise<LnbitsSettled[]> {
  if (!URL || !KEY) return [];
  try {
    const r = await fetch(`${URL}/api/v1/payments?limit=${limit}`, {
      headers: { "X-Api-Key": KEY },
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) return [];
    const arr = (await r.json()) as Array<{
      status?: string;
      amount?: number; // msat (kladné = příchozí)
      memo?: string;
      payment_hash?: string;
    }>;
    const out: LnbitsSettled[] = [];
    for (const p of arr) {
      if (p.status !== "success") continue;
      if (!p.amount || p.amount <= 0) continue; // jen příchozí
      const m = (p.memo ?? "").match(/Order ID:\s*([a-z0-9]+)/i);
      if (!m) continue;
      out.push({
        orderId: m[1],
        hash: p.payment_hash ?? "",
        sats: Math.round(p.amount / 1000),
      });
    }
    return out;
  } catch {
    return [];
  }
}
