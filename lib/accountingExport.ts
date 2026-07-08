import { prisma } from "@/lib/prisma";
import { fetchDailyBtcCzk, rateForDay } from "@/lib/priceHistory";

// Začátek sbírky — od kdy potřebujeme historické kurzy.
const CAMPAIGN_START = "2026-05-25";

// Číslo s desetinnou TEČKOU, bez oddělovače tisíců — univerzálně čitelné
// (čárka jako desetinný oddělovač se v mnoha nástrojích čte jako oddělovač tisíců).
const num = (v: number | null | undefined, dp: number) =>
  v == null ? "" : Number(v).toFixed(dp);
const q = (s: unknown) => `"${String(s ?? "").replace(/"/g, '""')}"`;

/** Poslední dokončený měsíc jako YYYY-MM (default cutoff). */
export function lastCompletedMonth(): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  d.setUTCMonth(d.getUTCMonth() - 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export interface ContributionsCsv {
  month: string; // YYYY-MM
  filename: string;
  csv: string; // vč. BOM
  count: number;
  sumCzkValue: number;
}

/**
 * Sestaví účetní CSV všech potvrzených příspěvků přijatých DO KONCE daného měsíce.
 * CZK dary v korunové hodnotě (interní kurz z potvrzení), BTC dary přepočteny
 * denním historickým kurzem BTC/CZK (CoinGecko). Sdílené adminem i měsíčním cronem.
 */
export async function buildContributionsCsv(
  monthParam?: string | null,
): Promise<ContributionsCsv> {
  const month = /^\d{4}-\d{2}$/.test(monthParam ?? "")
    ? (monthParam as string)
    : lastCompletedMonth();
  const [y, m] = month.split("-").map(Number);
  const cutoff = new Date(Date.UTC(y, m, 1) - 1); // konec měsíce (poslední ms)

  const daysBack =
    Math.ceil((Date.now() - Date.parse(CAMPAIGN_START)) / 86400000) + 2;
  const rates = await fetchDailyBtcCzk(daysBack);

  // Jen BTC příspěvky — CZK platby jsou doložené oficiálními bankovními výpisy.
  const rows = await prisma.donation.findMany({
    where: {
      status: "confirmed",
      currency: "BTC",
      OR: [
        { confirmedAt: { lte: cutoff } },
        { AND: [{ confirmedAt: null }, { createdAt: { lte: cutoff } }] },
      ],
    },
    orderBy: [{ confirmedAt: "asc" }, { createdAt: "asc" }],
    select: {
      id: true, createdAt: true, confirmedAt: true, amountBtc: true,
      kind: true, name: true, btcpayInvoiceId: true,
    },
  });

  const header = [
    "Datum přijetí", "Čas (UTC)", "Kampaň", "Částka (sat)", "Částka (BTC)",
    "Kurz CZK/BTC (den přijetí)", "Hodnota CZK (den přijetí)", "Zdroj kurzu",
    "Jméno (veřejné)", "ID transakce",
  ];
  const lines = [header.map(q).join(";")];
  let sumCzkValue = 0;

  for (const d of rows) {
    const when = d.confirmedAt ?? d.createdAt;
    const day = when.toISOString().slice(0, 10);
    const time = when.toISOString().slice(11, 16);
    const kamp = d.kind === "supporters" ? "Podporovatelé (Patroni)" : "Hlavní sbírka";

    const btc = d.amountBtc ?? 0;
    const sats = Math.round(btc * 1e8);
    const rate = rateForDay(rates, day);
    const czkValue = rate != null ? btc * rate : null;
    if (czkValue != null) sumCzkValue += czkValue;

    lines.push(
      [
        q(day), q(time), q(kamp),
        String(sats),
        num(btc, 8),
        rate != null ? String(Math.round(rate)) : "",
        czkValue != null ? num(czkValue, 2) : "",
        q("CoinGecko (denní)"),
        q(d.name || ""),
        q(d.btcpayInvoiceId || d.id),
      ].join(";"),
    );
  }

  return {
    month,
    filename: `ucetni-prispevky-${month}.csv`,
    csv: "﻿" + lines.join("\r\n") + "\r\n",
    count: rows.length,
    sumCzkValue,
  };
}
