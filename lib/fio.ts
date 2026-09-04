/**
 * Klient pro Fio API Bankovnictví (https://www.fio.cz/bank-services/internetbanking-api).
 * Slouží k automatickému párování příchozích CZK plateb podle variabilního symbolu.
 *
 * Pozn.: token je vázaný na účet; používej READ-ONLY token. Limit: 1 dotaz / 30 s.
 *
 * Konektivita: Fio blokuje IP našeho serveru na API hostu (fioapi.fio.cz). Když je
 * nastavené `FIO_TUNNEL_PORT`, jdou dotazy přes lokální SSH tunel (127.0.0.1:PORT →
 * fioapi.fio.cz:443 přes povolený stroj, viz systemd monument-fio-tunnel). node:https
 * se správným SNI/Host obejde blok; TLS je end-to-end na Fio (tunel jen přenáší bajty).
 */

import { request as httpsRequest } from "node:https";

const FIO_HOST = "fioapi.fio.cz";
const FIO_PATH = "/v1/rest";
const TUNNEL_PORT = process.env.FIO_TUNNEL_PORT; // např. "9443" → přes tunel

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

interface FioResp {
  ok: boolean;
  status: number;
  text: string;
}

/** GET na Fio API — přes tunel (node:https se správným SNI/Host) nebo napřímo (fetch). */
function fioGet(path: string, timeoutMs = 12000): Promise<FioResp> {
  const fullPath = `${FIO_PATH}${path}`;
  if (TUNNEL_PORT) {
    return new Promise((resolve) => {
      const req = httpsRequest(
        {
          host: "127.0.0.1",
          port: Number(TUNNEL_PORT),
          path: fullPath,
          method: "GET",
          servername: FIO_HOST, // SNI + ověření certifikátu proti fioapi.fio.cz
          headers: { Host: FIO_HOST },
          timeout: timeoutMs,
        },
        (res) => {
          let data = "";
          res.on("data", (c) => (data += c));
          res.on("end", () =>
            resolve({
              ok: (res.statusCode ?? 0) >= 200 && (res.statusCode ?? 0) < 300,
              status: res.statusCode ?? 0,
              text: data,
            }),
          );
        },
      );
      req.on("timeout", () => {
        req.destroy();
        resolve({ ok: false, status: 0, text: "" });
      });
      req.on("error", () => resolve({ ok: false, status: 0, text: "" }));
      req.end();
    });
  }
  // Napřímo (bez tunelu).
  return fetch(`https://${FIO_HOST}${fullPath}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  })
    .then(async (res) => ({ ok: res.ok, status: res.status, text: await res.text() }))
    .catch(() => ({ ok: false, status: 0, text: "" }));
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

  const res = await fioGet(`/last/${token}/transactions.json`);

  if (res.status === 409) {
    return { ok: false, reason: "rate_limited", status: 409, transactions: [] };
  }
  if (!res.ok) {
    return { ok: false, reason: "error", status: res.status, transactions: [] };
  }

  let data: {
    accountStatement?: { transactionList?: { transaction?: RawTx[] } };
  };
  try {
    data = JSON.parse(res.text);
  } catch {
    return { ok: false, reason: "error", status: res.status, transactions: [] };
  }
  const list = data.accountStatement?.transactionList?.transaction ?? [];
  return { ok: true, transactions: list.map(parseTx) };
}

/**
 * Jednorázové nastavení „zarážky" na dané datum (YYYY-MM-DD) — při zapínání
 * integrace / re-syncu, ať se stáhne požadovaný rozsah historie.
 */
export async function setFioCursorDate(date: string): Promise<boolean> {
  const token = process.env.FIO_TOKEN;
  if (!token) return false;
  const res = await fioGet(`/set-last-date/${token}/${date}/`);
  return res.ok;
}
