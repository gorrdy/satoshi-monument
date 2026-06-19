/**
 * Globální nastavení webu (tabulka Setting, klíč → hodnota).
 * Zatím: uzavření hlavní sbírky + zafixovaný snapshot konečného stavu.
 */
import { prisma } from "./prisma";

export interface CampaignClose {
  closed: boolean;
  closedAt: string | null; // ISO čas uzavření
  raisedBtc: number; // zafixované vybráno (snapshot)
  donorCount: number; // zafixovaný počet přispěvatelů (snapshot)
}

const DEFAULT: CampaignClose = {
  closed: false,
  closedAt: null,
  raisedBtc: 0,
  donorCount: 0,
};
const KEY = "campaignClose";

let _cache: { at: number; data: CampaignClose } | null = null;
const TTL_MS = 8_000;

export async function getCampaignClose(): Promise<CampaignClose> {
  const now = Date.now();
  if (_cache && now - _cache.at < TTL_MS) return _cache.data;
  let data = DEFAULT;
  try {
    const row = await prisma.setting.findUnique({ where: { key: KEY } });
    if (row) data = { ...DEFAULT, ...JSON.parse(row.value) };
  } catch {}
  _cache = { at: now, data };
  return data;
}

export async function setCampaignClose(data: CampaignClose): Promise<void> {
  await prisma.setting.upsert({
    where: { key: KEY },
    create: { key: KEY, value: JSON.stringify(data) },
    update: { value: JSON.stringify(data) },
  });
  _cache = { at: Date.now(), data };
}
