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

/**
 * Hluboký sken: projde CELOU historii LNbits přes stránkování (offset) a vrátí
 * všechny úspěšné příchozí platby s naším Order ID. Klouzavé okno `lnbitsRecentSettled`
 * mine staré platby (výpadek cronu delší než okno, nárazový příval, dary starší než
 * cron). Tenhle sweep je zachytí. Per Order ID ponecháme první výskyt (nejnovější).
 */
export async function lnbitsAllSettled(): Promise<LnbitsSettled[]> {
  if (!URL || !KEY) return [];
  const PAGE = 500;
  const MAX_PAGES = 60; // pojistka: max 30 000 plateb
  const seen = new Set<string>();
  const out: LnbitsSettled[] = [];
  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      const r = await fetch(
        `${URL}/api/v1/payments?limit=${PAGE}&offset=${page * PAGE}`,
        { headers: { "X-Api-Key": KEY }, signal: AbortSignal.timeout(20000) },
      );
      if (!r.ok) break;
      const arr = (await r.json()) as Array<{
        status?: string;
        amount?: number;
        memo?: string;
        payment_hash?: string;
      }>;
      if (!arr.length) break;
      for (const p of arr) {
        if (p.status !== "success") continue;
        if (!p.amount || p.amount <= 0) continue;
        const m = (p.memo ?? "").match(/Order ID:\s*([a-z0-9]+)/i);
        if (!m || seen.has(m[1])) continue;
        seen.add(m[1]);
        out.push({
          orderId: m[1],
          hash: p.payment_hash ?? "",
          sats: Math.round(p.amount / 1000),
        });
      }
      if (arr.length < PAGE) break; // poslední stránka
    }
    return out;
  } catch {
    return out; // co se stihlo, vrať
  }
}
