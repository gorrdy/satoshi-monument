/**
 * BTC kurz (CZK + USD) z CoinGecko s jednoduchou in-memory cache (~5 min).
 */

let cached: { czk: number; usd: number; at: number } | null = null;
const TTL_MS = 5 * 60 * 1000;

const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=czk,usd";

async function getRates(): Promise<{ czk: number; usd: number }> {
  const now = Date.now();
  if (cached && now - cached.at < TTL_MS) {
    return { czk: cached.czk, usd: cached.usd };
  }

  try {
    const res = await fetch(COINGECKO_URL, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = (await res.json()) as {
        bitcoin?: { czk?: number; usd?: number };
      };
      const czk = data.bitcoin?.czk;
      const usd = data.bitcoin?.usd;
      if (czk && czk > 0) {
        cached = { czk, usd: usd && usd > 0 ? usd : (cached?.usd ?? 0), at: now };
        return { czk: cached.czk, usd: cached.usd };
      }
    }
  } catch {
    // spadneme na poslední známý kurz níže
  }

  // fallback: poslední známé kurzy, jinak rozumný odhad
  return { czk: cached?.czk ?? 2_000_000, usd: cached?.usd ?? 90_000 };
}

export async function getBtcCzkRate(): Promise<number> {
  return (await getRates()).czk;
}

export async function getBtcUsdRate(): Promise<number> {
  return (await getRates()).usd;
}

/** Přepočet CZK na BTC aktuálním kurzem. */
export async function czkToBtc(czk: number): Promise<number> {
  const rate = await getBtcCzkRate();
  return czk / rate;
}
