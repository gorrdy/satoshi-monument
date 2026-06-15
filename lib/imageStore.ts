import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";

/**
 * Ukládání obrázků (logo/avatar) jako malý lokální webp.
 * Vše se re-enkóduje přes sharp (sanitizace + zmenšení) — na stránce se pak
 * reálně načítá jen pár kB. Servíruje se přes GET /api/uploads/[name].
 */

const DIR = path.join(process.cwd(), "uploads");
const MAX_DIM = 256; // avatary na stránce jsou ≤ ~64 px (256 = retina rezerva)
const MAX_FETCH_BYTES = 12 * 1024 * 1024;

/** Zmenší vstupní obrázek na malý webp, uloží a vrátí veřejnou URL. */
export async function saveWebp(input: Buffer): Promise<string> {
  const out = await sharp(input, { density: 200 })
    .resize(MAX_DIM, MAX_DIM, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  const name = `${crypto.randomBytes(8).toString("hex")}.webp`;
  await mkdir(DIR, { recursive: true });
  await writeFile(path.join(DIR, name), out);
  return `/api/uploads/${name}`;
}

/** Hrubá ochrana proti SSRF — blokace loopback/privátních/link-local adres. */
function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || h === "::1") return true;
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a === 0 || a === 127 || a === 10) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 169 && b === 254) return true; // link-local / cloud metadata
  }
  return false;
}

/** Stáhne externí obrázek a uloží jako malý lokální webp. null při chybě. */
export async function fetchAndLocalize(url: string): Promise<string | null> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (isPrivateHost(u.hostname)) return null;
  try {
    const res = await fetch(u, {
      signal: AbortSignal.timeout(10000),
      redirect: "follow",
    });
    if (!res.ok) return null;
    if (!(res.headers.get("content-type") || "").startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_FETCH_BYTES) return null;
    return await saveWebp(buf);
  } catch {
    return null;
  }
}

/**
 * Normalizace zadané imageUrl pro uložení:
 * - prázdné → null
 * - už lokální (/api/uploads/…) → beze změny
 * - externí http(s) → stáhnout a zmenšit na lokální webp; když to selže, ponechá se původní URL
 * - cokoli jiného → null
 */
export async function resolveImageUrl(
  raw: string | undefined | null,
): Promise<string | null> {
  const u = (raw ?? "").trim().slice(0, 500);
  if (!u) return null;
  if (/^\/api\/uploads\/[\w.-]+$/.test(u)) return u;
  if (/^https?:\/\//i.test(u)) {
    const local = await fetchAndLocalize(u);
    return local ?? u;
  }
  return null;
}
