"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { fiatCode } from "@/lib/fiat";
import { formatUsd } from "@/lib/format";
import type { PaymentResult } from "./PaymentModal";
import GoalNotice from "./GoalNotice";

type Method = "CZK" | "BTC";

const SATS_PER_BTC = 100_000_000;
// Dolní mez BTC příspěvku (musí odpovídat MIN_SATS na serveru). Pod ní BTCPay
// invoice odmítne (dust limit) → raději srozumitelná hláška místo „bránu se nepodařilo otevřít".
const MIN_SATS = 1000;
// BTC se ve formuláři zadává v satoshi; na BTC se převede až při odeslání.
const RANGES: Record<Method, { min: number; max: number }> = {
  CZK: { min: 250, max: 1_000_000 },
  BTC: { min: 10_000, max: 100_000_000 }, // 10k sats – 1 BTC
};
const DEFAULTS: Record<Method, string> = { CZK: "500", BTC: "50000" };

const NAMES = {
  cs: {
    first: ["Jan", "Petr", "Tomáš", "Martin", "Jakub", "Ondřej", "Pavel", "Lukáš", "David", "Jiří", "Josef", "Marek", "Michal", "Filip", "Adam", "Vojtěch", "Štěpán", "Roman"],
    last: ["Novák", "Svoboda", "Dvořák", "Černý", "Procházka", "Kučera", "Veselý", "Horák", "Němec", "Marek", "Pospíšil", "Hájek", "Král", "Beneš"],
  },
  en: {
    first: ["James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Satoshi", "Hal", "Nick", "Adam", "Daniel", "Henry", "Jack"],
    last: ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Wilson", "Moore", "Taylor", "Anderson", "Finney", "Nakamoto"],
  },
};

const MESSAGES = {
  cs: [
    "Přispívám, protože chci v Praze Satoshiho sochu",
    "Satoshi si sochu v Praze zaslouží",
    "Pro svobodné peníze a sochu v srdci Evropy",
    "Bitcoin změnil svět – ať to Praha připomíná",
    "Malý sat, velká myšlenka",
    "Ať Satoshi stojí i v Praze",
    "Přidávám se k 21 metropolím",
    "Decentralizace si zaslouží monument",
    "Za svobodu, za Bitcoin, za Prahu",
    "Každý sat se počítá",
    "Praha + Satoshi = ❤️",
    "Stavíme historii, sat po satu",
    "Pro budoucí generace hodlerů",
    "Protože kód je zákon a svoboda je cíl",
    "Ať i Praha má svého Satoshiho",
    "Hrdě přispívám na sochu Satoshiho",
    "Za 21 milionů důvodů",
    "Tahle socha patří do Prahy",
    "Díky, Satoshi. Tohle je pro tebe.",
    "Don't trust, verify – a postav sochu",
  ],
  en: [
    "I'm contributing because I want a Satoshi statue in Prague",
    "Satoshi deserves a statue in Prague",
    "For sound money and a monument in the heart of Europe",
    "Bitcoin changed the world — let Prague remember",
    "A small sat, a big idea",
    "Let Satoshi stand in Prague too",
    "Joining the 21 cities",
    "Decentralization deserves a monument",
    "For freedom, for Bitcoin, for Prague",
    "Every sat counts",
    "Prague + Satoshi = ❤️",
    "Building history, sat by sat",
    "For future generations of hodlers",
    "Because code is law and freedom is the goal",
    "Prague should have its Satoshi",
    "Proudly supporting the Satoshi statue",
    "For 21 million reasons",
    "This statue belongs in Prague",
    "Thank you, Satoshi. This one's for you.",
    "Don't trust, verify — and build the statue",
  ],
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}
function toPos(amount: number, min: number, max: number) {
  const v = clamp(amount, min, max);
  return (Math.log(v) - Math.log(min)) / (Math.log(max) - Math.log(min));
}
function fromPos(pos: number, min: number, max: number) {
  return Math.exp(Math.log(min) + pos * (Math.log(max) - Math.log(min)));
}
function roundCzk(v: number) {
  if (v < 1000) return Math.round(v / 10) * 10;
  if (v < 10000) return Math.round(v / 50) * 50;
  return Math.round(v / 500) * 500;
}
function roundSats(v: number) {
  if (v < 100_000) return Math.round(v / 1000) * 1000;
  if (v < 1_000_000) return Math.round(v / 10_000) * 10_000;
  return Math.round(v / 100_000) * 100_000;
}
function trimBtc(btc: number): string {
  return String(Number(btc.toFixed(8)));
}

export default function DonationForm({
  onResult,
}: {
  onResult: (r: PaymentResult) => void;
}) {
  const t = useTranslations("form");
  const locale = useLocale();
  const [method, setMethod] = useState<Method>("BTC");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState(DEFAULTS.BTC);
  const [publicMessage, setPublicMessage] = useState("");
  const [privateMessage, setPrivateMessage] = useState("");
  const [donorKey, setDonorKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Zvolená jednotka zobrazení u BTC platby (klik na štítek cyklí sats→BTC→CZK).
  // "CZK" = sentinel pro lokální fiat (CZK v cs, USD v en).
  const [btcDisplay, setBtcDisplay] = useState<"sats" | "BTC" | "CZK">("sats");
  const [czkRate, setCzkRate] = useState<number | null>(null);
  const [usdRate, setUsdRate] = useState<number | null>(null);
  // Skupinový režim: volitelné logo/fotka skupiny (checkbox → upload + logo 21).
  const [groupMode, setGroupMode] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageBg, setImageBg] = useState<string>("#ffffff");
  const [uploadingImg, setUploadingImg] = useState(false);

  const onPickImage = async (file: File) => {
    setUploadingImg(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      if (r.ok) {
        const d = (await r.json()) as { url?: string };
        if (d.url) {
          setImageUrl(d.url);
          setImageBg("#ffffff");
        }
      }
    } finally {
      setUploadingImg(false);
    }
  };
  const use21Logo = () => {
    setImageUrl("/partners/jednadvacet-21.webp");
    setImageBg("#000000");
    // Předvyplň šablonu identifikátoru lokální skupiny (přepíše si „mesto").
    setDonorKey((k) => (k.trim() ? k : "jednadvacet-mesto"));
  };
  // Fiat dle locale: en → USD, cs → CZK. Jen orientační ekvivalent, ne platební měna.
  const fc = fiatCode(locale); // "USD" | "CZK"
  const fiatRate = locale === "en" ? usdRate : czkRate;

  // Předvyplnění (jen na klientu, ať nevznikne hydration mismatch).
  useEffect(() => {
    const pool = locale === "en" ? NAMES.en : NAMES.cs;
    setName(`${pick(pool.first)} ${pick(pool.last)}`);
    setPublicMessage(pick(locale === "en" ? MESSAGES.en : MESSAGES.cs));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Kurz pro přepočet zobrazení sats ↔ CZK.
  useEffect(() => {
    fetch("/api/stats", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.stats?.btcCzkRate) setCzkRate(d.stats.btcCzkRate);
        if (d?.stats?.btcUsdRate) setUsdRate(d.stats.btcUsdRate);
      })
      .catch(() => {});
  }, []);

  const range = RANGES[method];
  const amtNum = parseFloat(amount.replace(",", "."));
  const safeAmt = Number.isFinite(amtNum) && amtNum > 0 ? amtNum : range.min;
  // Jednotka zobrazení: u CZK vždy CZK; u BTC dle zvoleného přepínače (klikem).
  // CZK volba bez kurzu spadne zpět na sats.
  const unit =
    method !== "BTC"
      ? "CZK"
      : btcDisplay === "CZK" && !fiatRate
        ? "sats"
        : btcDisplay;

  // Hodnota v inputu (safeAmt je u BTC v sats). U BTC platby "CZK" = lokální fiat.
  const displayValue =
    method !== "BTC"
      ? amount
      : unit === "BTC"
        ? trimBtc(safeAmt / SATS_PER_BTC)
        : unit === "CZK" && fiatRate
          ? String(Math.round((safeAmt / SATS_PER_BTC) * fiatRate))
          : amount;

  // Formátované minimum v sats (pro hlášku i hint).
  const minSatsLabel = MIN_SATS.toLocaleString(locale === "en" ? "en-US" : "cs-CZ");

  // Doména posuvníku v aktuální jednotce. CZK platba (bankovní převod) má limity
  // 250–1 000 000 Kč; fiat-zobrazení u BTC platby se odvodí z rozsahu sats × kurz.
  const dom =
    method !== "BTC"
      ? { min: 250, max: 1_000_000 }
      : unit === "BTC"
        ? { min: RANGES.BTC.min / SATS_PER_BTC, max: RANGES.BTC.max / SATS_PER_BTC }
        : unit === "CZK" && fiatRate
          ? {
              min: (RANGES.BTC.min / SATS_PER_BTC) * fiatRate,
              max: (RANGES.BTC.max / SATS_PER_BTC) * fiatRate,
            }
          : { min: RANGES.BTC.min, max: RANGES.BTC.max }; // sats

  // Aktuální hodnota přepočtená do jednotky posuvníku.
  const dispVal =
    method !== "BTC"
      ? safeAmt
      : unit === "BTC"
        ? safeAmt / SATS_PER_BTC
        : unit === "CZK" && fiatRate
          ? (safeAmt / SATS_PER_BTC) * fiatRate
          : safeAmt; // sats

  // Klik na štítek → cyklus sats → BTC → fiat (fiat jen když máme kurz).
  const cycleUnit = () =>
    setBtcDisplay((u) =>
      u === "sats" ? "BTC" : u === "BTC" ? (fiatRate ? "CZK" : "sats") : "sats",
    );

  // Zápis z inputu → ulož kanonicky v sats (u BTC).
  const onAmountInput = (raw: string) => {
    if (method !== "BTC") {
      setAmount(raw);
      return;
    }
    const n = parseFloat(raw.replace(",", "."));
    if (!Number.isFinite(n)) {
      setAmount("0");
      return;
    }
    if (unit === "BTC") setAmount(String(Math.round(n * SATS_PER_BTC)));
    else if (unit === "CZK" && fiatRate)
      setAmount(String(Math.round((n / fiatRate) * SATS_PER_BTC)));
    else setAmount(String(Math.round(n))); // sats
  };

  const selectMethod = (m: Method) => {
    setMethod(m);
    setAmount(DEFAULTS[m]);
    setBtcDisplay("sats");
  };

  const onSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const p = Number(e.target.value) / 1000;
    const v = fromPos(p, dom.min, dom.max);
    if (method !== "BTC") {
      setAmount(String(roundCzk(v)));
    } else if (unit === "BTC") {
      setAmount(String(roundSats(v * SATS_PER_BTC)));
    } else if (unit === "CZK" && fiatRate) {
      setAmount(String(Math.round((roundCzk(v) / fiatRate) * SATS_PER_BTC)));
    } else {
      setAmount(String(roundSats(v))); // sats
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!Number.isFinite(amtNum) || amtNum <= 0) {
      setError(t("errorAmount"));
      return;
    }
    // amtNum je u BTC v sats → ověřit dolní mez ještě před voláním API.
    if (method === "BTC" && amtNum < MIN_SATS) {
      setError(t("errorMinBtc", { min: minSatsLabel }));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/donations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          currency: method,
          // BTC se zadává v sats → převést na BTC pro API.
          amount: method === "BTC" ? amtNum / SATS_PER_BTC : amtNum,
          publicMessage,
          privateMessage,
          donorKey,
          locale,
          group: groupMode,
          imageUrl: groupMode ? (imageUrl ?? undefined) : undefined,
          imageBg: groupMode && imageUrl ? imageBg : undefined,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(
          res.status === 429
            ? t("errorRateLimit")
            : data.error === "amount_too_low"
              ? t("errorMinBtc", { min: minSatsLabel })
              : data.error === "btcpay_failed"
                ? t("errorBtcpay")
                : data.error === "invalid_amount"
                  ? t("errorAmount")
                  : t("errorGeneric"),
        );
        return;
      }
      const data = (await res.json()) as PaymentResult;
      onResult(data);
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setLoading(false);
    }
  };

  // Jednotka v popisku: CZK platba vždy "CZK"; u BTC platby lokální fiat (fc).
  const unitLabel = method !== "BTC" ? "CZK" : unit === "CZK" ? fc : unit;

  // Popisek meze — hodnota už je v jednotce posuvníku (dom).
  const boundLabel = (v: number) => {
    if (method !== "BTC") return `${v.toLocaleString("cs-CZ")} Kč`;
    if (unit === "BTC") return `${trimBtc(v)} BTC`;
    if (unit === "CZK")
      return fc === "USD"
        ? formatUsd(v, locale)
        : `${Math.round(v).toLocaleString("cs-CZ")} Kč`;
    return `${v.toLocaleString("cs-CZ")} sats`;
  };

  // EN nápověda u korunové platby: orientační $ ekvivalent zadané částky.
  const czkUsdHint =
    method === "CZK" && locale === "en" && usdRate && czkRate
      ? formatUsd((safeAmt / czkRate) * usdRate, locale)
      : null;

  return (
    <form
      onSubmit={submit}
      className="ui-card p-6 sm:p-8"
      style={{
        background: "color-mix(in srgb, var(--surface) 62%, transparent)",
        backdropFilter: "none",
        WebkitBackdropFilter: "none",
      }}
    >
      <h3 className="ui-display text-3xl font-bold mb-1">{t("title")}</h3>
      <p className="text-sm ui-muted mb-6">{t("subtitle")}</p>

      <GoalNotice />

      {/* Výběr metody — karty s ikonami */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {(["BTC", "CZK"] as Method[]).map((m) => {
          const active = method === m;
          const isBtc = m === "BTC";
          return (
            <button
              key={m}
              type="button"
              onClick={() => selectMethod(m)}
              aria-pressed={active}
              className="relative ui-border ui-soft p-4 text-left rounded-[var(--radius-sm)] transition-colors"
              style={
                active
                  ? {
                      borderColor: "var(--accent)",
                      background:
                        "color-mix(in srgb, var(--accent) 12%, var(--surface-2))",
                    }
                  : undefined
              }
            >
              {isBtc ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src="/bitcoin.webp"
                  alt="Bitcoin"
                  width={40}
                  height={40}
                  className="w-10 h-10 mb-3"
                />
              ) : (
                <span className="flex items-center justify-center w-10 h-10 mb-3 rounded-[var(--radius-sm)] ui-soft ui-border">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-label="Fiat"
                  >
                    <rect x="2" y="6" width="20" height="12" rx="2" />
                    <circle cx="12" cy="12" r="2.5" />
                    <path d="M6 12h.01M18 12h.01" />
                  </svg>
                </span>
              )}
              <div className="ui-display font-bold text-sm">
                {isBtc ? t("methodBtcName") : t("methodCzkName")}
              </div>
              <div className="ui-eyebrow text-[0.6rem] mt-1 ui-muted">
                {isBtc ? t("methodBtcSub") : t("methodCzkSub")}
              </div>
              {active && (
                <span
                  className="absolute top-3 right-3 flex items-center justify-center w-5 h-5 rounded-[var(--radius-sm)]"
                  style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
                >
                  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M4 8.5l2.5 2.5L12 5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="don-name" className="block ui-eyebrow ui-muted mb-1.5">
            {t("name")}
          </label>
          <input
            id="don-name"
            className="ui-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("namePlaceholder")}
            maxLength={80}
          />
        </div>

        {/* Částka — posuvník (log) + ruční zadání */}
        <div>
          <label htmlFor="don-amount" className="block ui-eyebrow ui-muted mb-1.5">
            {t("amount")} · {unitLabel}
          </label>
          <div className="relative">
            <input
              id="don-amount"
              className="ui-input ui-mono text-lg pr-20"
              value={displayValue}
              onChange={(e) => onAmountInput(e.target.value)}
              inputMode="decimal"
            />
            {method === "BTC" ? (
              <button
                type="button"
                onClick={cycleUnit}
                title={`Přepnout jednotku (sats / BTC / ${fc})`}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs ui-mono ui-border rounded-[var(--radius-sm)] ui-soft press"
              >
                {unitLabel} ⇅
              </button>
            ) : (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm ui-mono ui-muted">
                Kč
              </span>
            )}
          </div>
          {czkUsdHint && (
            <div className="ui-mono text-xs ui-muted mt-1.5">
              {t("approxUsdHint", { amount: czkUsdHint })}
            </div>
          )}
          {method === "BTC" && (
            <div className="ui-mono text-xs ui-muted mt-1.5">
              {t("minBtcHint", { min: minSatsLabel })}
            </div>
          )}
          <input
            type="range"
            min={0}
            max={1000}
            value={Math.round(toPos(dispVal, dom.min, dom.max) * 1000)}
            onChange={onSlider}
            className="range-accent mt-3"
            aria-label={t("amount")}
          />
          <div className="flex justify-between ui-mono text-xs ui-muted mt-1.5">
            <span>{boundLabel(dom.min)}</span>
            <span>{boundLabel(dom.max)}</span>
          </div>
        </div>

        <div>
          <label htmlFor="don-public" className="block ui-eyebrow ui-muted mb-1.5">
            {t("publicMessage")}
          </label>
          <textarea
            id="don-public"
            className="ui-input resize-none"
            value={publicMessage}
            onChange={(e) => setPublicMessage(e.target.value)}
            placeholder={t("publicMessagePlaceholder")}
            rows={2}
            maxLength={280}
          />
        </div>

        <div>
          <label htmlFor="don-key" className="block ui-eyebrow ui-muted mb-1.5">
            {t("donorKey")}
          </label>
          <input
            id="don-key"
            className="ui-input"
            value={donorKey}
            onChange={(e) => setDonorKey(e.target.value)}
            placeholder={t("donorKeyPlaceholder")}
            maxLength={120}
          />
          <p className="text-xs ui-muted mt-1.5 leading-snug">{t("donorKeyHint")}</p>
        </div>

        {/* Skupina: volitelné logo/fotka */}
        <div>
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={groupMode}
              onChange={(e) => setGroupMode(e.target.checked)}
              className="accent-[var(--accent)]"
            />
            {t("groupToggle")}
          </label>
          {groupMode && (
            <div className="mt-3 ui-soft ui-border rounded-[var(--radius-sm)] p-3 space-y-3">
              <p className="text-xs ui-muted leading-snug">{t("groupHelp")}</p>
              <div className="flex items-center gap-3">
                <div
                  className="w-14 h-14 shrink-0 overflow-hidden rounded-[var(--radius-sm)] ui-border flex items-center justify-center"
                  style={{ background: imageUrl ? imageBg : "transparent" }}
                >
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl}
                      alt=""
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="ui-muted text-xl">🏢</span>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 items-start">
                  <label className="ui-btn press px-3 py-1.5 text-sm cursor-pointer">
                    {uploadingImg ? t("uploading") : t("uploadLogo")}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        if (f) onPickImage(f);
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={use21Logo}
                    className="ui-link ui-eyebrow text-left"
                  >
                    {t("use21Logo")}
                  </button>
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl(null)}
                      className="ui-link ui-eyebrow text-left ui-muted"
                    >
                      {t("removeLogo")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <details className="group">
          <summary className="cursor-pointer ui-eyebrow ui-link list-none flex items-center gap-1.5">
            <span className="transition-transform group-open:rotate-90">›</span>
            {t("privateMessage")}
          </summary>
          <textarea
            className="ui-input resize-none mt-2"
            value={privateMessage}
            onChange={(e) => setPrivateMessage(e.target.value)}
            placeholder={t("privateMessagePlaceholder")}
            rows={2}
            maxLength={1000}
          />
        </details>
      </div>

      {error && (
        <p
          role="alert"
          aria-live="polite"
          className="text-sm mt-4 ui-border px-3 py-2 rounded-[var(--radius-sm)]"
          style={{ background: "color-mix(in srgb, var(--accent) 14%, transparent)" }}
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="ui-btn press w-full mt-5 py-3.5 text-base"
      >
        {loading
          ? t("submitting")
          : method === "BTC"
            ? t("submitBtc")
            : t("submitCzk")}
        <span>→</span>
      </button>

      <p className="mt-3 text-center text-xs ui-muted">{t("motivation")}</p>
    </form>
  );
}
