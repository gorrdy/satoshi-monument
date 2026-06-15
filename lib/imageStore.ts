import { writeFile, mkdir } from "fs/promises";
import { lookup } from "dns/promises";
import net from "net";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";

/**
 * Ukládání obrázků (logo/avatar) jako malý lokální webp.
 * Vše se re-enkóduje přes sharp (sanitizace + zmenšení) — na stránce se pak
 * reálně načítá jen pár kB. Servíruje se přes GET /api/uploads/[name].
 */

const DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
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

/** Je IP privátní/loopback/link-local/ULA? (IPv4 vč. non-canonical + IPv6) */
function ipIsPrivate(ip: string): boolean {
  const v4 = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 192 && b === 168) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 169 && b === 254) || // link-local / cloud metadata
      (a === 100 && b >= 64 && b <= 127) // CGNAT
    );
  }
  const h = ip.toLowerCase();
  if (h === "::1" || h === "::") return true;
  if (h.startsWith("fe80")) return true; // link-local
  if (h.startsWith("fc") || h.startsWith("fd")) return true; // ULA fc00::/7
  if (h.startsWith("::ffff:")) return ipIsPrivate(h.slice(7)); // IPv4-mapped
  return false;
}

/**
 * SSRF ochrana: hostname se RESOLVNE a zkontrolují se reálné IP (anti-rebind),
 * + odmítnutí literálních privátních IP (vč. IPv6/non-canonical). Nelze-li
 * resolvovat → odmítnout.
 */
async function hostResolvesPrivate(hostname: string): Promise<boolean> {
  const bare = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!bare || bare === "localhost" || bare.endsWith(".localhost")) return true;
  if (net.isIP(bare)) return ipIsPrivate(bare);
  try {
    const addrs = await lookup(bare, { all: true });
    return addrs.length === 0 || addrs.some((a) => ipIsPrivate(a.address));
  } catch {
    return true;
  }
}

/**
 * Stáhne externí obrázek a uloží jako malý lokální webp. null při chybě.
 * Redirecty se sledují ručně a každý hop se znovu SSRF-validuje (proti
 * přesměrování na interní adresu).
 */
export async function fetchAndLocalize(url: string): Promise<string | null> {
  let current: URL;
  try {
    current = new URL(url);
  } catch {
    return null;
  }
  let res: Response | null = null;
  for (let hop = 0; hop < 4; hop++) {
    if (current.protocol !== "http:" && current.protocol !== "https:") return null;
    if (await hostResolvesPrivate(current.hostname)) return null;
    try {
      res = await fetch(current, {
        signal: AbortSignal.timeout(10000),
        redirect: "manual",
      });
    } catch {
      return null;
    }
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return null;
      try {
        current = new URL(loc, current);
      } catch {
        return null;
      }
      continue; // znovu zvaliduj cílový host
    }
    break;
  }
  if (!res || !res.ok) return null;
  if (!(res.headers.get("content-type") || "").startsWith("image/")) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_FETCH_BYTES) return null;
  return await saveWebp(buf);
}

/**
 * Normalizace zadané imageUrl pro uložení:
 * - prázdné → null
 * - už lokální (/api/uploads/…) → beze změny
 * - externí http(s) → stáhnout a zmenšit na lokální webp; když to selže → null
 *   (NEukládáme původní externí URL — nešel by přes ni leak/tracking na zdi)
 * - cokoli jiného → null
 */
export async function resolveImageUrl(
  raw: string | undefined | null,
): Promise<string | null> {
  const u = (raw ?? "").trim().slice(0, 500);
  if (!u) return null;
  if (/^\/api\/uploads\/[\w.-]+$/.test(u)) return u;
  if (/^https?:\/\//i.test(u)) {
    // Když se nepodaří stáhnout a zlokalizovat, obrázek zahodíme (ne fallback na externí URL).
    return await fetchAndLocalize(u);
  }
  return null;
}
