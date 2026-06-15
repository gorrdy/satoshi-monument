/** Pomocné formátování částek (bezpečné pro klienta i server). */

export function formatBtc(value: number): string {
  if (!Number.isFinite(value)) return "0";
  // Až 8 desetinných míst, ořež koncové nuly.
  const s = value.toFixed(8).replace(/\.?0+$/, "");
  return s === "" || s === "-0" ? "0" : s;
}

export function formatCzk(value: number, locale = "cs"): string {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "cs-CZ", {
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

export function formatSats(btc: number): string {
  return new Intl.NumberFormat("cs-CZ").format(Math.round(btc * 1e8));
}

export function formatUsd(value: number, locale = "en"): string {
  return new Intl.NumberFormat(locale === "cs" ? "cs-CZ" : "en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}
