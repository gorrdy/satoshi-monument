/**
 * Klient pro Fio API Bankovnictví (https://www.fio.cz/bank-services/internetbanking-api).
 * Slouží k automatickému párování příchozích CZK plateb podle variabilního symbolu.
 *
 * Pozn.: token je vázaný na účet; používej READ-ONLY token. Limit: 1 dotaz / 30 s.
 */

const FIO_BASE = "https://fioapi.fio.cz/v1/rest";

export interface FioTx {
  id: string; // ID pohybu (column22)
  amount: number; // Objem (column1) — kladné = příchozí
  currency: string; // Měna (column14)
  vs: string | null; // variabilní symbol (column5)
  message: string | null; // zpráva pro příjemce (column16)
  payerName: string | null; // název protiúčtu (column10)
  date: string | null; // datum (column0)
}

type Col = { value: unknown } | null;
type RawTx = Record<string, Col>;

function val(tx: RawTx, n: number): string | null {
  const c = tx[`column${n}`];
  if (!c || c.value === null || c.value === undefined) return null;
  return String(c.value);
}

function parseTx(tx: RawTx): FioTx {
  return {
    id: val(tx, 22) ?? "",
    amount: Number(val(tx, 1) ?? "0"),
    currency: val(tx, 14) ?? "CZK",
    vs: val(tx, 5),
    message: val(tx, 16),
    payerName: val(tx, 10),
    date: val(tx, 0),
  };
}

export interface FioFetchResult {
  ok: boolean;
  reason?: "no_token" | "rate_limited" | "error";
  status?: number;
  transactions: FioTx[];
}

/**
 * Načte NOVÉ transakce od posledního stažení (Fio si drží „zarážku" na serveru).
 * Vrací prázdný seznam, když token chybí (no_token) nebo při limitu (rate_limited).
 */
export async function fetchNewFioTransactions(): Promise<FioFetchResult> {
  const token = process.env.FIO_TOKEN;
  if (!token) return { ok: false, reason: "no_token", transactions: [] };

  let res: Response;
  try {
    res = await fetch(`${FIO_BASE}/last/${token}/transactions.json`, {
      cache: "no-store",
    });
  } catch {
    return { ok: false, reason: "error", transactions: [] };
  }

  if (res.status === 409) {
    return { ok: false, reason: "rate_limited", status: 409, transactions: [] };
  }
  if (!res.ok) {
    return { ok: false, reason: "error", status: res.status, transactions: [] };
  }

  const data = (await res.json()) as {
    accountStatement?: { transactionList?: { transaction?: RawTx[] } };
  };
  const list = data.accountStatement?.transactionList?.transaction ?? [];
  return { ok: true, transactions: list.map(parseTx) };
}

/**
 * Jednorázové nastavení „zarážky" na dané datum (YYYY-MM-DD) — při zapínání
 * integrace, ať se nestahuje celá historie účtu.
 */
export async function setFioCursorDate(date: string): Promise<boolean> {
  const token = process.env.FIO_TOKEN;
  if (!token) return false;
  const res = await fetch(`${FIO_BASE}/set-last-date/${token}/${date}/`, {
    cache: "no-store",
  });
  return res.ok;
}
