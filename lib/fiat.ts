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

/**
 * BTC částka → kompletní fiat řetězec vč. měny dle locale:
 *   en → „$1,234"   ·   cs → „1 234 Kč"
 * Jedno místo pro přepočet i jednotku (dřív se „Kč"/„$" řešilo ručně na více místech).
 */
export function formatFiat(btc: number, rates: RatesLike, locale: string): string {
  return locale === "en"
    ? formatUsd(btc * rates.btcUsdRate, locale)
    : `${formatCzk(btc * rates.btcCzkRate, locale)} Kč`;
}
