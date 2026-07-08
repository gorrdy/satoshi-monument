import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";
import { fetchDailyBtcCzk, rateForDay } from "@/lib/priceHistory";

export const dynamic = "force-dynamic";

// Začátek sbírky — od kdy potřebujeme historické kurzy.
const CAMPAIGN_START = "2026-05-25";

// České číslo: desetinná čárka, bez oddělovače tisíců.
const num = (v: number | null | undefined, dp: number) =>
  v == null ? "" : Number(v).toFixed(dp).replace(".", ",");
const q = (s: unknown) => `"${String(s ?? "").replace(/"/g, '""')}"`;

/** Poslední dokončený měsíc jako YYYY-MM (default cutoff). */
function lastCompletedMonth(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth(); // 0-11 aktuální
  const d = new Date(Date.UTC(y, m, 1)); // 1. den aktuálního měsíce
  d.setUTCMonth(d.getUTCMonth() - 1); // → předchozí měsíc
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function GET(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const monthParam = req.nextUrl.searchParams.get("month");
  const month = /^\d{4}-\d{2}$/.test(monthParam ?? "")
    ? (monthParam as string)
    : lastCompletedMonth();
  const [y, m] = month.split("-").map(Number);
  // Cutoff = konec zvoleného měsíce (poslední ms, UTC).
  const cutoff = new Date(Date.UTC(y, m, 1) - 1);

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

  const header = [
    "Datum přijetí", "Čas (UTC)", "Kampaň", "Měna", "Částka (původní)", "Částka BTC",
    "Kurz CZK/BTC (den přijetí)", "Hodnota CZK (den přijetí)", "Způsob platby",
    "Zdroj kurzu", "Variabilní symbol", "Jméno (veřejné)", "ID transakce",
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
    lines.push(
      [
        q(day), q(time), q(kamp), q(d.currency),
        num(d.amount, d.currency === "CZK" ? 2 : 8),
        num(d.amountBtc, 8),
        rate != null ? num(Math.round(rate), 0) : "",
        czkValue != null ? num(czkValue, 2) : "",
        q(method), q(source), q(d.variableSymbol || ""), q(d.name || ""),
        q(d.currency === "CZK" ? d.id : d.btcpayInvoiceId || d.id),
      ].join(";"),
    );
  }

  // Souhrnný řádek (oddělený prázdným řádkem, ať nerozbije import tabulky).
  lines.push("");
  lines.push(
    [q(`SOUHRN k ${month} (konec měsíce)`), "", "", "", "", "", "",
      num(sumCzkValue, 2), q(`${rows.length} příspěvků`), "", "", "", ""].join(";"),
  );

  const csv = "﻿" + lines.join("\r\n") + "\r\n";
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ucetni-prispevky-${month}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
