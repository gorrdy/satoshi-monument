/**
 * E-maily projektu. Místo notifikace za každou platbu posíláme jednou denně
 * souhrnný report na projektový e-mail.
 * Když SMTP_* / ORGANIZER_EMAIL nejsou nastavené, funkce tiše nic neudělá.
 */

import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | null = null;
let initialized = false;

function getTransporter(): Transporter | null {
  if (initialized) return transporter;
  initialized = true;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host) {
    transporter = null;
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });
  return transporter;
}

/** Cílový e-mail pro účetní měsíční report (lze přebít env ACCOUNTING_EMAIL). */
export const ACCOUNTING_EMAIL =
  process.env.ACCOUNTING_EMAIL ?? "dvorakh1997+malahar@gmail.com";

/**
 * Měsíční e-mail pro účetní: CSV výpis příspěvků za daný měsíc v příloze.
 * (PDF oficiální výpisy z banky se doplní později, až bude zdroj.)
 */
export async function sendMonthlyAccounting(opts: {
  month: string; // YYYY-MM
  filename: string;
  csv: string;
  count: number;
  sumCzkValue: number;
  attachments?: { filename: string; content: Buffer; contentType?: string }[];
}): Promise<boolean> {
  const tx = getTransporter();
  if (!tx) return false;
  const from =
    process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "monument@gorrdy.cz";
  const replyTo = process.env.SMTP_REPLY_TO;

  const sumCzk = opts.sumCzkValue.toLocaleString("cs-CZ", {
    maximumFractionDigits: 0,
  });
  const extra = opts.attachments ?? [];
  const text = [
    `Účetní export sbírky Satoshi Monument — období do konce ${opts.month}.`,
    "",
    `Přiložené CSV obsahuje ${opts.count} potvrzených BTC příspěvků`,
    `(datum, částka BTC, kurz BTC v den přijetí, hodnota v CZK).`,
    `Celková hodnota v čase přijetí: ≈ ${sumCzk} Kč.`,
    "",
    "CZK (bankovní) platby v CSV nejsou — ty jsou doložené oficiálními",
    "bankovními výpisy.",
    extra.length ? `Přiloženo také ${extra.length} bankovních výpisů (PDF).` : "",
    "",
    "BTC dary jsou přepočteny denním tržním kurzem BTC/CZK (CoinGecko)",
    "ke dni přijetí — orientační.",
  ].filter((l) => l !== null).join("\n");

  try {
    await tx.sendMail({
      from,
      to: ACCOUNTING_EMAIL,
      replyTo,
      subject: `Satoshi Monument — účetní export ${opts.month}`,
      text,
      attachments: [
        { filename: opts.filename, content: opts.csv, contentType: "text/csv; charset=utf-8" },
        ...extra,
      ],
    });
    return true;
  } catch (err) {
    console.error("sendMonthlyAccounting: e-mail se nepodařilo odeslat:", err);
    return false;
  }
}

export interface DailyReport {
  windowHours: number;
  newTotal: number; // nově vzniklé příspěvky v okně
  confirmedTotal: number; // prošlo (potvrzeno) v okně
  confirmedBtcCount: number;
  confirmedCzkCount: number;
  sumBtc: number; // BTC ekvivalent prošlých plateb v okně
  sumCzk: number; // CZK z prošlých fiat plateb v okně
  failedTotal: number; // neprošlo (expirované + zamítnuté) v okně
  expired: number;
  rejected: number;
  pending: number; // stále čeká
  unmatchedFioCount: number; // nepárované příchozí Fio platby (k vyřízení)
  unmatchedFioSumCzk: number;
  allTimeRaisedBtc: number;
  allTimeDonors: number;
  goalBtc: number;
}

function fmtNum(n: number, digits = 0) {
  return n.toLocaleString("cs-CZ", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export async function sendDailyReport(r: DailyReport): Promise<boolean> {
  const to = process.env.ORGANIZER_EMAIL;
  const tx = getTransporter();
  if (!to || !tx) return false;

  const from =
    process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "monument@gorrdy.cz";
  const replyTo = process.env.SMTP_REPLY_TO;

  const percent =
    r.goalBtc > 0 ? (r.allTimeRaisedBtc / r.goalBtc) * 100 : 0;

  const lines = [
    `Denní report sbírky Satoshi Monument (za posledních ${r.windowHours} h)`,
    "",
    `PROŠLO: ${r.confirmedTotal}`,
    `  • Bitcoin: ${r.confirmedBtcCount}`,
    `  • Fiat (CZK): ${r.confirmedCzkCount}`,
    `  • Objem: ${fmtNum(r.sumBtc, 8)} BTC + ${fmtNum(r.sumCzk)} Kč`,
    "",
    `NEPROŠLO: ${r.failedTotal}`,
    `  • Expirované: ${r.expired}`,
    `  • Zamítnuté: ${r.rejected}`,
    "",
    `Čeká na potvrzení: ${r.pending}`,
    `Nových příspěvků celkem: ${r.newTotal}`,
    "",
    r.unmatchedFioCount > 0
      ? `⚠ Nepárované příchozí platby z Fio: ${r.unmatchedFioCount} (Σ ${fmtNum(r.unmatchedFioSumCzk)} Kč) — vyřiď v administraci`
      : "Nepárované příchozí platby z Fio: 0",
    "",
    "— Celkový stav sbírky —",
    `Vybráno: ${fmtNum(r.allTimeRaisedBtc, 8)} / ${fmtNum(r.goalBtc, 0)} BTC (${fmtNum(percent, 1)} %)`,
    `Přispěvatelů celkem: ${r.allTimeDonors}`,
    "",
    `Administrace: ${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/admin`,
  ];

  try {
    await tx.sendMail({
      from,
      to,
      replyTo,
      subject: `🗿 Satoshi Monument — denní report (prošlo ${r.confirmedTotal}, neprošlo ${r.failedTotal})`,
      text: lines.join("\n"),
    });
    return true;
  } catch (err) {
    console.error("sendDailyReport: e-mail se nepodařilo odeslat:", err);
    return false;
  }
}
