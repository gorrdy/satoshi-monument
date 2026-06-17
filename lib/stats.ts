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
// Po dosažení základního cíle se cíl prodlouží na maximální (dle pravidel sbírky).
const GOAL_BTC_MAX = Number(process.env.GOAL_BTC_MAX ?? "1.3");

export interface CampaignStats {
  goalBtc: number; // aktuální cíl (základní 1 BTC, po dosažení prodloužený na 1,3 BTC)
  goalReached: boolean; // dosažen základní cíl (≥ GOAL_BTC) → spouští banner i prodloužení
  raisedBtc: number;
  percent: number;
  donorCount: number;
  btcCzkRate: number;
  btcUsdRate: number;
  raisedCzk: number;
  raisedUsd: number;
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

  // Dosažení 1 BTC → cíl se prodlouží na 1,3 BTC (progress bar napočítává k němu).
  const goalReached = raisedBtc >= GOAL_BTC;
  const goalBtc = goalReached ? GOAL_BTC_MAX : GOAL_BTC;
  const percent = goalBtc > 0 ? Math.min(100, (raisedBtc / goalBtc) * 100) : 0;

  return {
    goalBtc,
    goalReached,
    raisedBtc,
    percent,
    donorCount: donors.size,
    btcCzkRate,
    btcUsdRate,
    raisedCzk: raisedBtc * btcCzkRate,
    raisedUsd: raisedBtc * btcUsdRate,
  };
}

export interface WallItem {
  name: string; // reálné jméno zadané u TÉTO platby (v detailu skupiny)
  amount: number;
  currency: string; // "BTC" | "CZK"
  amountBtc: number;
  publicMessage: string | null;
  createdAt: string;
}

export interface WallEntry {
  id: string;
  name: string; // zobrazené jméno skupiny (profil nebo poslední zadané)
  lastContributor: string | null; // poslední přispívající (raw jméno poslední platby)
  searchNames: string[]; // reálná jména přispěvatelů (pro hledání), jiná než zobrazené
  currency: string; // "BTC" | "CZK" | "MIX"
  amount: number; // zobrazená částka v dané měně (u MIX = BTC ekvivalent)
  amountBtc: number; // celkový BTC ekvivalent (pro řazení)
  publicMessage: string | null;
  count: number; // počet sečtených plateb
  createdAt: string;
  imageUrl: string | null; // volitelné logo/obrázek (nastavuje admin)
  imageBg: string | null; // barva pozadí pod logem (hex)
  items?: WallItem[]; // jednotlivé příspěvky — dotahují se lazy přes getWallItems()
}

export interface DonorProfileLite {
  name: string;
  imageUrl: string | null;
  imageBg: string | null;
}

/** Profily identifikátorů → Map<donorKey, {name, logo}>. Přebíjí to, co zadá user. */
export async function getDonorProfiles(): Promise<Map<string, DonorProfileLite>> {
  const rows = await prisma.donorProfile.findMany({
    select: { donorKey: true, name: true, imageUrl: true, imageBg: true },
  });
  const m = new Map<string, DonorProfileLite>();
  for (const r of rows) {
    m.set(r.donorKey, { name: r.name, imageUrl: r.imageUrl, imageBg: r.imageBg });
  }
  return m;
}

async function buildWallEntries(): Promise<WallEntry[]> {
  const [rows, profiles] = await Promise.all([
    prisma.donation.findMany({
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
    }),
    getDonorProfiles(),
  ]);

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
    // jméno/nickname a poslední neprázdný vzkaz. Logo se naopak bere z PRVNÍ platby,
    // která ho nastavila — pozdější dárce pod stejným identifikátorem už avatar
    // skupiny nepřebije (profil identifikátoru má i tak přednost, viz níže).
    const sorted = [...list].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
    const latest = sorted[sorted.length - 1];
    const lastMsg = [...sorted].reverse().find((r) => r.publicMessage)?.publicMessage ?? null;
    const imgRow = sorted.find((r) => r.imageUrl); // první nastavené logo vyhrává
    let name = latest.name;
    let imageUrl = imgRow?.imageUrl ?? null;
    let imageBg = imgRow?.imageBg ?? null;

    // Profil identifikátoru přebíjí jméno (vždy) i logo (pokud je nastavené).
    if (key.startsWith("k:")) {
      const prof = profiles.get(key.slice(2));
      if (prof) {
        name = prof.name;
        if (prof.imageUrl) {
          imageUrl = prof.imageUrl;
          imageBg = prof.imageBg;
        }
      }
    }

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
      name: r.name,
      amount: r.amount,
      currency: r.currency,
      amountBtc: r.amountBtc ?? 0,
      publicMessage: r.publicMessage,
      createdAt: (r.confirmedAt ?? r.createdAt).toISOString(),
    }));

    // Jména přispěvatelů pro hledání — unikátní reálná jména, která se liší od
    // zobrazeného (jména shodná s názvem skupiny by jen nafukovala payload).
    const dispLower = name.toLowerCase();
    const searchNames = [
      ...new Set(
        list
          .map((r) => r.name)
          .filter((n) => n && n.toLowerCase() !== dispLower),
      ),
    ];

    entries.push({
      id: publicGroupId(key),
      name,
      // poslední přispívající = raw jméno poslední platby (užitečné u skupin/profilů)
      lastContributor: latest.name,
      searchNames,
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
  return entries;
}

// Krátká in-process cache sestavených skupin — sdílí getWall() i getWallItems(),
// takže detail (/api/wall/items) nepřepočítává všechny skupiny zvlášť.
const WALL_TTL_MS = 12_000;
let _wallEntries: { at: number; data: WallEntry[] } | null = null;
async function getCachedWallEntries(): Promise<WallEntry[]> {
  const now = Date.now();
  if (_wallEntries && now - _wallEntries.at < WALL_TTL_MS) return _wallEntries.data;
  const data = await buildWallEntries();
  _wallEntries = { at: now, data };
  return data;
}

/**
 * Veřejná zeď — VŠICHNI přispěvatelé, seřazení dle BTC ekvivalentu.
 * Bez položkového rozpisu (`items`) — ten se dotahuje lazy přes getWallItems(),
 * takže payload /api/stats zůstává malý i s rostoucím počtem dárců.
 */
export async function getWall(): Promise<WallEntry[]> {
  const entries = await getCachedWallEntries();
  return entries.map((e) => ({ ...e, items: undefined }));
}

/** Rozpis jednotlivých příspěvků jedné skupiny dle veřejného (soleného) id. */
export async function getWallItems(id: string): Promise<WallItem[] | null> {
  const entries = await getCachedWallEntries();
  return entries.find((e) => e.id === id)?.items ?? null;
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
      donorKey: true,
      confirmedAt: true,
      createdAt: true,
    },
  });

  // Logo se váže k identifikátoru: když tahle platba logo nemá, ale stejný
  // donorKey ho má na jiné platbě, použijeme ho (stejně jako na zdi).
  const needKeys = [
    ...new Set(rows.filter((r) => !r.imageUrl && r.donorKey).map((r) => r.donorKey!)),
  ];
  const logoByKey = new Map<string, { imageUrl: string; imageBg: string | null }>();
  if (needKeys.length) {
    const logoRows = await prisma.donation.findMany({
      where: { donorKey: { in: needKeys }, imageUrl: { not: null } },
      orderBy: { createdAt: "asc" }, // první nastavené logo vyhrává (nejde přebít pozdějším darem)
      select: { donorKey: true, imageUrl: true, imageBg: true },
    });
    for (const lr of logoRows) {
      if (lr.donorKey && lr.imageUrl && !logoByKey.has(lr.donorKey)) {
        logoByKey.set(lr.donorKey, { imageUrl: lr.imageUrl, imageBg: lr.imageBg });
      }
    }
  }

  // Profil identifikátoru přebíjí jméno (vždy) i logo (pokud je nastavené).
  const profiles = await getDonorProfiles();

  return rows.map((r) => {
    const prof = r.donorKey ? profiles.get(r.donorKey) : undefined;
    const fb = !r.imageUrl && r.donorKey ? logoByKey.get(r.donorKey) : undefined;
    let imageUrl = r.imageUrl ?? fb?.imageUrl ?? null;
    let imageBg = r.imageUrl ? r.imageBg ?? null : fb?.imageBg ?? null;
    if (prof?.imageUrl) {
      imageUrl = prof.imageUrl;
      imageBg = prof.imageBg;
    }
    return {
      id: publicGroupId(r.id),
      name: prof?.name ?? r.name,
      currency: r.currency,
      amount: r.amount,
      amountBtc: r.amountBtc ?? 0,
      createdAt: (r.confirmedAt ?? r.createdAt).toISOString(),
      imageUrl,
      imageBg,
    };
  });
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

// ---- In-process cache složeného stavu pro /api/stats ----
// Eliminuje recompute ze SQLite při každém pollu (klienti pollu á ~30 s).
// Krátké TTL; data jsou stejně eventually-consistent. Každá instance vlastní cache.
const BUNDLE_TTL_MS = 12_000;
let _bundle: { at: number; data: Awaited<ReturnType<typeof buildStatsBundle>> } | null =
  null;

async function buildStatsBundle() {
  const [stats, wall, recent, pending] = await Promise.all([
    getStats(),
    getWall(),
    getRecent(10),
    getPending(3),
  ]);
  return { stats, wall, recent, pending };
}

/** Složený stav pro /api/stats s krátkou in-process cache (anti-recompute). */
export async function getStatsBundle() {
  const now = Date.now();
  if (_bundle && now - _bundle.at < BUNDLE_TTL_MS) return _bundle.data;
  const data = await buildStatsBundle();
  _bundle = { at: now, data };
  return data;
}
