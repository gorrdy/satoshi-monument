/**
 * Převod českého čísla účtu (číslo[-předčíslí]/kód banky) na IBAN.
 *
 * Český BBAN = kód banky (4) + předčíslí (6) + číslo účtu (10) = 16 číslic.
 * Kontrolní číslice se počítají algoritmem MOD-97 (ISO 13616).
 */

/** MOD-97 nad číselným řetězcem (zvládne libovolně dlouhá čísla). */
function mod97(input: string): number {
  let remainder = 0;
  for (const ch of input) {
    remainder = (remainder * 10 + (ch.charCodeAt(0) - 48)) % 97;
  }
  return remainder;
}

/**
 * @param account číslo účtu, volitelně s předčíslím: "1701007015" nebo "19-1701007015"
 * @param bankCode čtyřmístný kód banky, např. "3030"
 */
export function czAccountToIban(account: string, bankCode: string): string {
  let prefix = "0";
  let number = account.trim();

  if (number.includes("-")) {
    const [p, n] = number.split("-");
    prefix = p;
    number = n;
  }

  const bank = bankCode.trim().padStart(4, "0");
  const prefixPadded = prefix.padStart(6, "0");
  const numberPadded = number.padStart(10, "0");

  const bban = `${bank}${prefixPadded}${numberPadded}`; // 20 číslic

  // "CZ00" převedeme na čísla (C=12, Z=35) a přesuneme na konec
  const rearranged = `${bban}123500`;
  const check = 98 - mod97(rearranged);
  const checkDigits = check.toString().padStart(2, "0");

  return `CZ${checkDigits}${bban}`;
}

/** Formátovaný IBAN po čtveřicích, např. "CZ44 3030 0000 0017 0100 7015". */
export function formatIban(iban: string): string {
  return iban.replace(/(.{4})/g, "$1 ").trim();
}
