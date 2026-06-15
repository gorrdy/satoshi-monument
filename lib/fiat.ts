import { formatCzk, formatUsd } from "./format";

/**
 * Display fiat dle locale: cs → CZK, en → USD.
 * USD/CZK jsou jen ORIENTAČNÍ ekvivalent BTC (aktuálním kurzem) — nejde o platební měnu.
 */

interface RatesLike {
  btcCzkRate: number;
  btcUsdRate: number;
}

export function fiatCode(locale: string): "USD" | "CZK" {
  return locale === "en" ? "USD" : "CZK";
}

/** Kurz BTC→fiat pro dané locale. */
export function fiatRate(rates: RatesLike, locale: string): number {
  return locale === "en" ? rates.btcUsdRate : rates.btcCzkRate;
}

/** Naformátuje BTC částku jako fiat ekvivalent dle locale. */
export function formatBtcAsFiat(
  btc: number,
  rates: RatesLike,
  locale: string,
): string {
  return locale === "en"
    ? formatUsd(btc * rates.btcUsdRate, locale)
    : formatCzk(btc * rates.btcCzkRate, locale);
}
