/**
 * Generátor SPAYD řetězce (Short Payment Descriptor) pro český standard QR Platba.
 * Specifikace: https://qr-platba.cz
 *
 * Příklad: SPD*1.0*ACC:CZ4430300000001701007015*AM:480.50*CC:CZK*MSG:Dar*X-VS:123
 */

import { czAccountToIban } from "./iban";

/** Percent-encoding znaků, které SPAYD nepovoluje (mimo ASCII tisknutelné a `*`). */
function sanitize(value: string): string {
  // Hvězdička je oddělovač polí – nahradíme. Diakritiku převedeme na ASCII.
  const ascii = value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // odstranění diakritiky
    .replace(/\*/g, " ");
  // Ponecháme tisknutelné ASCII; ostatní zahodíme.
  return ascii.replace(/[^ -~]/g, "").trim();
}

export interface SpaydOptions {
  account: string; // číslo účtu (volitelně s předčíslím)
  bankCode: string; // kód banky
  amount: number; // částka v CZK
  message?: string; // zpráva pro příjemce (MSG, max 60 znaků)
  variableSymbol?: string; // X-VS
  recipientName?: string; // RN
}

export function buildSpayd(opts: SpaydOptions): string {
  const iban = czAccountToIban(opts.account, opts.bankCode);

  const fields: string[] = ["SPD", "1.0", `ACC:${iban}`];

  // Částka na dvě desetinná místa, tečka jako oddělovač.
  fields.push(`AM:${opts.amount.toFixed(2)}`);
  fields.push("CC:CZK");

  if (opts.recipientName) {
    fields.push(`RN:${sanitize(opts.recipientName).slice(0, 35)}`);
  }
  if (opts.message) {
    fields.push(`MSG:${sanitize(opts.message).slice(0, 60)}`);
  }
  if (opts.variableSymbol) {
    fields.push(`X-VS:${opts.variableSymbol.replace(/\D/g, "").slice(0, 10)}`);
  }

  return fields.join("*");
}

/** Vygeneruje numerický variabilní symbol (max 10 číslic) z ID a času. */
export function makeVariableSymbol(seed: string): string {
  let hash = 0;
  for (const ch of seed) {
    hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  }
  // 9 číslic, ať se vejde do limitu VS (10).
  return (hash % 1_000_000_000).toString().padStart(9, "0");
}
