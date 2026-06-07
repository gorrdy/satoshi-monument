/**
 * Sdílené čtení dat sbírky: souhrn (progress bar) a zeď přispěvatelů.
 */

import crypto from "crypto";
import { prisma } from "./prisma";
import { getBtcCzkRate } from "./price";

// Neodvoditelné id skupiny pro veřejnou zeď (nesmí prozradit donorKey/e-mail).
function publicGroupId(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex").slice(0, 16);
}

const GOAL_BTC = Number(process.env.GOAL_BTC ?? "1");

export interface CampaignStats {
  goalBtc: number;
  raisedBtc: number;
  percent: number;
  donorCount: number;
  btcCzkRate: number;
  raisedCzk: number;
}

export async function getStats(): Promise<CampaignStats> {
  const confirmed = await prisma.donation.findMany({
    where: { status: "confirmed" },
    select: { amountBtc: true, donorKey: true, id: true },
  });

  const raisedBtc = confirmed.reduce((sum, d) => sum + (d.amountBtc ?? 0), 0);
  const btcCzkRate = await getBtcCzkRate();

  // Unikátní přispěvatelé: seskupení podle donorKey (kdo nemá klíč = samostatně),
  // stejně jako na zdi — víc plateb jednoho dárce = jeden přispěvatel.
  const donors = new Set(
    confirmed.map((d) => (d.donorKey ? `k:${d.donorKey}` : `s:${d.id}`)),
  );

  const percent = GOAL_BTC > 0 ? Math.min(100, (raisedBtc / GOAL_BTC) * 100) : 0;

  return {
    goalBtc: GOAL_BTC,
    raisedBtc,
    percent,
    donorCount: donors.size,
    btcCzkRate,
    raisedCzk: raisedBtc * btcCzkRate,
  };
}

export interface WallEntry {
  id: string;
  name: string;
  currency: string; // "BTC" | "CZK" | "MIX"
  amount: number; // zobrazená částka v dané měně (u MIX = BTC ekvivalent)
  amountBtc: number; // celkový BTC ekvivalent (pro řazení)
  publicMessage: string | null;
  count: number; // počet sečtených plateb
  createdAt: string;
}

export async function getWall(limit = 200): Promise<WallEntry[]> {
  const rows = await prisma.donation.findMany({
    where: { status: "confirmed", hiddenOnWall: false },
    orderBy: { confirmedAt: "asc" },
    select: {
      id: true,
      name: true,
      currency: true,
      amount: true,
      amountBtc: true,
      publicMessage: true,
      donorKey: true,
      confirmedAt: true,
      createdAt: true,
    },
  });

  // Seskupení podle donorKey (kdo nemá klíč, stojí samostatně).
  type Row = (typeof rows)[number];
  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    const key = r.donorKey ? `k:${r.donorKey}` : `s:${r.id}`;
    const arr = groups.get(key);
    if (arr) arr.push(r);
    else groups.set(key, [r]);
  }

  const entries: WallEntry[] = [];
  for (const [key, list] of groups) {
    // poslední příspěvek (nejnovější confirmedAt) → jméno; poslední neprázdný vzkaz
    const sorted = [...list].sort(
      (a, b) =>
        (a.confirmedAt ?? a.createdAt).getTime() -
        (b.confirmedAt ?? b.createdAt).getTime(),
    );
    const latest = sorted[sorted.length - 1];
    const lastMsg = [...sorted].reverse().find((r) => r.publicMessage)?.publicMessage ?? null;

    const totalBtc = list.reduce((s, r) => s + (r.amountBtc ?? 0), 0);
    const currencies = new Set(list.map((r) => r.currency));

    let currency: string;
    let amount: number;
    if (currencies.size === 1 && currencies.has("CZK")) {
      currency = "CZK";
      amount = list.reduce((s, r) => s + r.amount, 0);
    } else if (currencies.size === 1 && currencies.has("BTC")) {
      currency = "BTC";
      amount = list.reduce((s, r) => s + r.amount, 0);
    } else {
      currency = "MIX";
      amount = totalBtc;
    }

    entries.push({
      id: publicGroupId(key),
      name: latest.name,
      currency,
      amount,
      amountBtc: totalBtc,
      publicMessage: lastMsg,
      count: list.length,
      createdAt: (latest.confirmedAt ?? latest.createdAt).toISOString(),
    });
  }

  // Řazení od největšího přispěvatele (dle BTC ekvivalentu).
  entries.sort((a, b) => b.amountBtc - a.amountBtc);
  return entries.slice(0, limit);
}
