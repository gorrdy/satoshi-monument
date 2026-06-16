/**
 * Gamifikace: vizuální odlišení velkých příspěvků dle výše (v sats).
 *   ≥ 1 000 000 sats (0.01 BTC) → 🐋 „velryba" (silná oranžová záře)
 *   ≥   100 000 sats (0.001 BTC) → ⭐ (jemný oranžový rámeček)
 */
const WHALE_SATS = 1_000_000;
const BIG_SATS = 100_000;

function satsOf(amountBtc: number | null | undefined): number {
  return (amountBtc ?? 0) * 1e8;
}

/** Emoji odznak dle výše (prázdné = bez odznaku). */
export function tierEmoji(amountBtc: number | null | undefined): string {
  const s = satsOf(amountBtc);
  if (s >= WHALE_SATS) return "🐋";
  if (s >= BIG_SATS) return "⭐";
  return "";
}

/** Box-shadow (rámeček/záře) dle výše — pro inline style; undefined = nic. */
export function tierGlow(amountBtc: number | null | undefined): string | undefined {
  const s = satsOf(amountBtc);
  if (s >= WHALE_SATS)
    return "0 0 0 2px var(--accent), 0 0 22px -6px var(--accent)";
  if (s >= BIG_SATS) return "0 0 0 1.5px var(--accent)";
  return undefined;
}
