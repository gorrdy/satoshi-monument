/**
 * BTC/CZK kurz z CoinGecko s jednoduchou in-memory cache (~5 min).
 */

let cached: { rate: number; at: number } | null = null;
const TTL_MS = 5 * 60 * 1000;

const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=czk";

export async function getBtcCzkRate(): Promise<number> {
  const now = Date.now();
  if (cached && now - cached.at < TTL_MS) {
    return cached.rate;
  }

  try {
    const res = await fetch(COINGECKO_URL, {
      headers: { Accept: "application/json" },
      // necachovat na úrovni fetch, řídíme si to sami
      cache: "no-store",
    });
    if (res.ok) {
      const data = (await res.json()) as { bitcoin?: { czk?: number } };
      const rate = data.bitcoin?.czk;
      if (rate && rate > 0) {
        cached = { rate, at: now };
        return rate;
      }
    }
  } catch {
    // spadneme na poslední známý kurz níže
  }

  // fallback: poslední známý kurz, jinak rozumný odhad
  return cached?.rate ?? 2_000_000;
}

/** Přepočet CZK na BTC aktuálním kurzem. */
export async function czkToBtc(czk: number): Promise<number> {
  const rate = await getBtcCzkRate();
  return czk / rate;
}
