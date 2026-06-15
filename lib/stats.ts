/**
 * Sdílené čtení dat sbírky: souhrn (progress bar) a zeď přispěvatelů.
 */

import crypto from "crypto";
import { prisma } from "./prisma";
import { getBtcCzkRate, getBtcUsdRate } from "./price";

// Neodvoditelné id skupiny pro veřejnou zeď (nesmí prozradit donorKey/e-mail).
// Solíme serverovým tajemstvím → z id nelze potvrdit konkrétní e-mail (hash
// bez soli by šlo ověřit přepočítáním sha256 z uhádnutého e-mailu).
const GROUP_SALT =
  process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "monument";
function publicGroupId(key: string): string {
  return crypto
    .createHmac("sha256", GROUP_SALT)
    .update(key)
    .digest("hex")
    .slice(0, 16);
}

const GOAL_BTC = Number(process.env.GOAL_BTC ?? "1");

export interface CampaignStats {
  goalBtc: number;
  raisedBtc: number;
  percent: number;
  donorCount: number;
  btcCzkRate: number;
  btcUsdRate: number;
  raisedCzk: number;
}

export async function getStats(): Promise<CampaignStats> {
  const confirmed = await prisma.donation.findMany({
    where: { status: "confirmed" },
    select: { amountBtc: true, donorKey: true, id: true },
  });

  const raisedBtc = confirmed.reduce((sum, d) => sum + (d.amountBtc ?? 0), 0);
  const [btcCzkRate, btcUsdRate] = await Promise.all([
    getBtcCzkRate(),
    getBtcUsdRate(),
  ]);

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
    btcUsdRate,
    raisedCzk: raisedBtc * btcCzkRate,
  };
}

export interface WallItem {
  amount: number;
  currency: string; // "BTC" | "CZK"
  amountBtc: number;
  publicMessage: string | null;
  createdAt: string;
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
  imageUrl: string | null; // volitelné logo/obrázek (nastavuje admin)
  imageBg: string | null; // barva pozadí pod logem (hex)
  items: WallItem[]; // jednotlivé příspěvky (od nejnovějšího) — veřejná data
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
      imageUrl: true,
      imageBg: true,
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
    // Řazení podle času ODESLÁNÍ (createdAt) → na zdi se ukáže POSLEDNÍ zadané
    // jméno/nickname, poslední neprázdný vzkaz a poslední nastavené logo.
    const sorted = [...list].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
    const latest = sorted[sorted.length - 1];
    const lastMsg = [...sorted].reverse().find((r) => r.publicMessage)?.publicMessage ?? null;
    const imgRow = [...sorted].reverse().find((r) => r.imageUrl);
    const imageUrl = imgRow?.imageUrl ?? null;
    const imageBg = imgRow?.imageBg ?? null;

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

    // Rozpis jednotlivých příspěvků (od nejnovějšího) — jen veřejná pole.
    const items: WallItem[] = [...sorted].reverse().map((r) => ({
      amount: r.amount,
      currency: r.currency,
      amountBtc: r.amountBtc ?? 0,
      publicMessage: r.publicMessage,
      createdAt: (r.confirmedAt ?? r.createdAt).toISOString(),
    }));

    entries.push({
      id: publicGroupId(key),
      name: latest.name,
      currency,
      amount,
      amountBtc: totalBtc,
      publicMessage: lastMsg,
      count: list.length,
      createdAt: (latest.confirmedAt ?? latest.createdAt).toISOString(),
      imageUrl,
      imageBg,
      items,
    });
  }

  // Řazení od největšího přispěvatele (dle BTC ekvivalentu).
  entries.sort((a, b) => b.amountBtc - a.amountBtc);
  return entries.slice(0, limit);
}

export interface RecentDonation {
  id: string; // solené veřejné id (neprozrazuje donorKey/e-mail)
  name: string;
  currency: string; // "BTC" | "CZK"
  amount: number; // částka v původní měně
  amountBtc: number;
  createdAt: string; // čas potvrzení (ISO)
  imageUrl: string | null; // volitelné logo/obrázek (nastavuje admin)
  imageBg: string | null; // barva pozadí pod logem (hex)
}

/** Poslední potvrzené příspěvky (jednotlivé platby) pro „recent" feed. */
export async function getRecent(limit = 10): Promise<RecentDonation[]> {
  const rows = await prisma.donation.findMany({
    where: { status: "confirmed", hiddenOnWall: false },
    orderBy: { confirmedAt: "desc" },
    take: limit,
    select: {
      id: true,
      name: true,
      currency: true,
      amount: true,
      amountBtc: true,
      imageUrl: true,
      imageBg: true,
      confirmedAt: true,
      createdAt: true,
    },
  });

  return rows.map((r) => ({
    id: publicGroupId(r.id),
    name: r.name,
    currency: r.currency,
    amount: r.amount,
    amountBtc: r.amountBtc ?? 0,
    createdAt: (r.confirmedAt ?? r.createdAt).toISOString(),
    imageUrl: r.imageUrl ?? null,
    imageBg: r.imageBg ?? null,
  }));
}

export interface PendingDonation {
  id: string; // solené veřejné id — nic citlivého
  createdAt: string;
}

/**
 * Probíhající (pending) platby pro teaser „právě probíhá".
 * ZÁMĚRNĚ NEvrací jméno ani částku — klient ukáže jen rozmazaný placeholder.
 * Jen platby z posledních ~3 min (čistě vizuální teaser „právě teď") — na pozadí
 * se platba může spárovat/potvrdit i mnohem později, to tahle zkratka neovlivňuje.
 */
export async function getPending(limit = 3): Promise<PendingDonation[]> {
  const since = new Date(Date.now() - 3 * 60 * 1000);
  const rows = await prisma.donation.findMany({
    where: { status: "pending", hiddenOnWall: false, createdAt: { gt: since } },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, createdAt: true },
  });
  return rows.map((r) => ({
    id: publicGroupId(r.id),
    createdAt: r.createdAt.toISOString(),
  }));
}
