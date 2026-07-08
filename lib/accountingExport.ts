import { prisma } from "@/lib/prisma";
import { fetchDailyBtcCzk, rateForDay } from "@/lib/priceHistory";

// Začátek sbírky — od kdy potřebujeme historické kurzy.
const CAMPAIGN_START = "2026-05-25";

// České číslo: desetinná čárka, bez oddělovače tisíců.
const num = (v: number | null | undefined, dp: number) =>
  v == null ? "" : Number(v).toFixed(dp).replace(".", ",");
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

  const rows = await prisma.donation.findMany({
    where: {
      status: "confirmed",
      OR: [
        { confirmedAt: { lte: cutoff } },
        { AND: [{ confirmedAt: null }, { createdAt: { lte: cutoff } }] },
      ],
    },
    orderBy: [{ confirmedAt: "asc" }, { createdAt: "asc" }],
    select: {
      id: true, createdAt: true, confirmedAt: true, currency: true, amount: true,
      amountBtc: true, kind: true, name: true, variableSymbol: true, btcpayInvoiceId: true,
    },
  });

  // Bankovní detaily (Fio) pro CZK dary — napárování s řádky bankovního výpisu.
  const czkIds = rows.filter((r) => r.currency === "CZK").map((r) => r.id);
  const fioMap = new Map<string, { date: string; payerName: string; fioId: string }>();
  if (czkIds.length) {
    const fios = await prisma.fioPayment.findMany({
      where: { donationId: { in: czkIds } },
      select: { donationId: true, date: true, payerName: true, fioId: true },
    });
    for (const f of fios) {
      if (f.donationId && !fioMap.has(f.donationId)) {
        fioMap.set(f.donationId, {
          date: (f.date ?? "").slice(0, 10), // „2026-06-17+0200" → „2026-06-17"
          payerName: f.payerName ?? "",
          fioId: f.fioId ?? "",
        });
      }
    }
  }

  const header = [
    "Datum přijetí", "Čas (UTC)", "Kampaň", "Měna", "Částka (původní)", "Částka BTC",
    "Kurz CZK/BTC (den přijetí)", "Hodnota CZK (den přijetí)", "Způsob platby",
    "Zdroj kurzu", "Variabilní symbol", "Bankovní datum", "Plátce (z banky)",
    "Fio ID pohybu", "Jméno (veřejné)", "ID transakce",
  ];
  const lines = [header.map(q).join(";")];
  let sumCzkValue = 0;

  for (const d of rows) {
    const when = d.confirmedAt ?? d.createdAt;
    const day = when.toISOString().slice(0, 10);
    const time = when.toISOString().slice(11, 16);
    const kamp = d.kind === "supporters" ? "Podporovatelé (Patroni)" : "Hlavní sbírka";

    let rate: number | null;
    let czkValue: number | null;
    let source: string;
    if (d.currency === "CZK") {
      rate = d.amountBtc && d.amountBtc > 0 ? d.amount / d.amountBtc : rateForDay(rates, day);
      czkValue = d.amount;
      source = "interní (kurz při potvrzení)";
    } else {
      rate = rateForDay(rates, day);
      czkValue = rate != null && d.amountBtc != null ? d.amountBtc * rate : null;
      source = "CoinGecko (denní)";
    }
    if (czkValue != null) sumCzkValue += czkValue;

    const method =
      d.currency === "CZK" ? "Bankovní převod (Fio)" : "Bitcoin (on-chain/Lightning)";
    const fio = fioMap.get(d.id);
    lines.push(
      [
        q(day), q(time), q(kamp), q(d.currency),
        num(d.amount, d.currency === "CZK" ? 2 : 8),
        num(d.amountBtc, 8),
        rate != null ? num(Math.round(rate), 0) : "",
        czkValue != null ? num(czkValue, 2) : "",
        q(method), q(source), q(d.variableSymbol || ""),
        q(fio?.date || ""), q(fio?.payerName || ""), q(fio?.fioId || ""),
        q(d.name || ""),
        q(d.currency === "CZK" ? d.id : d.btcpayInvoiceId || d.id),
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
