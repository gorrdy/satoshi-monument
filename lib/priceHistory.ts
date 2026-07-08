/**
 * Historické denní kurzy BTC/CZK (CoinGecko) — pro účetní ocenění BTC darů
 * ke dni přijetí. Minulé dny se nemění, takže export je reprodukovatelný.
 */
export async function fetchDailyBtcCzk(days: number): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const d = Math.max(1, Math.min(3650, Math.ceil(days)));
  try {
    const r = await fetch(
      `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=czk&days=${d}`,
      { signal: AbortSignal.timeout(20000) },
    );
    if (!r.ok) return map;
    const j = (await r.json()) as { prices?: [number, number][] };
    // Poslední cena daného dne (blízko close) přepíše dřívější body.
    for (const [ms, price] of j.prices ?? []) {
      map.set(new Date(ms).toISOString().slice(0, 10), price);
    }
  } catch {
    /* vrať, co se stihlo (klidně prázdné) */
  }
  return map;
}

/** Kurz pro daný den (YYYY-MM-DD); když chybí, vezme nejbližší dostupný (±10 dní). */
export function rateForDay(map: Map<string, number>, day: string): number | null {
  if (map.has(day)) return map.get(day)!;
  const base = Date.parse(day + "T00:00:00Z");
  for (let i = 1; i <= 10; i++) {
    const minus = new Date(base - i * 86400000).toISOString().slice(0, 10);
    const plus = new Date(base + i * 86400000).toISOString().slice(0, 10);
    if (map.has(minus)) return map.get(minus)!;
    if (map.has(plus)) return map.get(plus)!;
  }
  return null;
}
