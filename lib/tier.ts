/**
 * Gamifikace: emoji odznak velkých příspěvků dle výše (v sats) — v recent feedu.
 *   ≥ 1 000 000 sats (0.01 BTC) → 🐋 „velryba"
 *   ≥   100 000 sats (0.001 BTC) → ⭐
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
