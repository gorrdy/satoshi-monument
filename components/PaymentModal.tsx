"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

export interface CzkResult {
  method: "czk";
  donationId: string;
  amount: number;
  variableSymbol: string;
  paymentRef: string;
  account: string;
  spayd: string;
  qrDataUrl: string;
}

export interface BtcResult {
  method: "btc";
  donationId: string;
  invoiceId: string;
  checkoutLink: string;
  btcpayUrl: string;
}

export type PaymentResult = CzkResult | BtcResult;

declare global {
  interface Window {
    btcpay?: {
      showInvoice: (id: string) => void;
      onModalReceiveMessage?: (handler: (e: MessageEvent) => void) => void;
    };
  }
}

function loadBtcpayScript(btcpayUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.btcpay) return resolve();
    const existing = document.getElementById("btcpay-modal-script");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }
    const script = document.createElement("script");
    script.id = "btcpay-modal-script";
    script.src = `${btcpayUrl}/modal/btcpay.js`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("btcpay.js load failed"));
    document.head.appendChild(script);
  });
}

export default function PaymentModal({
  result,
  onClose,
  onPaid,
}: {
  result: PaymentResult;
  onClose: () => void;
  onPaid: () => void;
}) {
  const t = useTranslations();
  const [copied, setCopied] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Klávesnice: ESC zavírá, Tab cyklí jen uvnitř modalu + počáteční fokus.
  useEffect(() => {
    const panel = panelRef.current;
    const focusable = () =>
      panel
        ? Array.from(
            panel.querySelectorAll<HTMLElement>(
              'a[href],button:not([disabled]),input,textarea,[tabindex]:not([tabindex="-1"])',
            ),
          ).filter((el) => el.offsetParent !== null)
        : [];
    (focusable()[0] ?? panel)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const items = focusable();
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (result.method !== "btc") return;
    let cancelled = false;
    loadBtcpayScript(result.btcpayUrl)
      .then(() => {
        if (cancelled || !window.btcpay) return;
        window.btcpay.onModalReceiveMessage?.((e: MessageEvent) => {
          const data = e.data as { status?: string };
          if (
            data?.status === "complete" ||
            data?.status === "paid" ||
            data?.status === "confirmed" ||
            data?.status === "settled"
          ) {
            onPaid();
          }
        });
        window.btcpay.showInvoice(result.invoiceId);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [result, onPaid]);

  const copyDetails = async () => {
    if (result.method !== "czk") return;
    const text = `Účet: ${result.account}\nČástka: ${result.amount} CZK\nVS: ${result.variableSymbol}\nPoznámka: ${result.paymentRef}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div
      className="fixed inset-0 z-[70] overflow-y-auto bg-black/80 backdrop-blur-sm"
      style={{ animation: "fadeUp 0.25s ease-out" }}
      onClick={onClose}
    >
      {/* min-h-full + flex → vysoký obsah (QR + detaily) jde odscrollovat uvnitř overlaye */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={result.method === "czk" ? t("qr.title") : t("btc.opening")}
          tabIndex={-1}
          className="relative w-full max-w-md ui-card p-6 sm:p-7 outline-none"
          onClick={(e) => e.stopPropagation()}
        >
        <button
          onClick={onClose}
          className="press absolute top-3 right-3 w-8 h-8 ui-border flex items-center justify-center rounded-[var(--radius-sm)]"
          aria-label={t("common.close")}
        >
          ✕
        </button>

        {result.method === "czk" ? (
          <div className="text-center">
            <h3 className="ui-display text-2xl font-bold mb-1">{t("qr.title")}</h3>
            <p className="text-sm ui-muted mb-5">{t("qr.subtitle")}</p>

            <div className="bg-white ui-border p-3 inline-block mb-5 rounded-[var(--radius-sm)]">
              <Image
                src={result.qrDataUrl}
                alt={`${t("qr.title")} — ${result.amount} CZK, VS ${result.variableSymbol}`}
                width={240}
                height={240}
                className="w-56 h-56"
                unoptimized
              />
            </div>

            <dl className="text-left text-sm space-y-2 ui-soft ui-border p-4 mb-3 ui-mono rounded-[var(--radius-sm)]">
              <div className="flex justify-between items-center">
                <dt className="ui-muted">{t("qr.account")}</dt>
                <dd>{result.account}</dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="ui-muted">{t("qr.amount")}</dt>
                <dd>{result.amount} CZK</dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="ui-muted">{t("qr.vs")}</dt>
                <dd>{result.variableSymbol}</dd>
              </div>
              <div className="flex justify-between items-center ui-border-t pt-2">
                <dt className="ui-muted">{t("qr.note")}</dt>
                <dd className="font-bold ui-accent">{result.paymentRef}</dd>
              </div>
            </dl>

            <button
              onClick={copyDetails}
              className="press w-full mb-4 ui-border py-2.5 ui-eyebrow rounded-[var(--radius-sm)]"
            >
              {copied ? t("qr.copied") : t("qr.copy")}
            </button>

            <p className="text-xs ui-muted mb-4">{t("qr.hint")}</p>

            <button onClick={onClose} className="ui-btn press w-full py-3">
              {t("qr.done")}
            </button>
          </div>
        ) : (
          <div className="text-center py-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/bitcoin.webp"
              alt="Bitcoin"
              className="mx-auto mb-5 w-16 h-16"
            />
            <h3 className="ui-display text-2xl font-bold mb-2">{t("btc.opening")}</h3>
            <p className="text-sm ui-muted mb-6">{t("btc.thanks")}</p>
            <a
              href={result.checkoutLink}
              target="_blank"
              rel="noopener noreferrer"
              className="ui-btn press px-6 py-3"
            >
              {t("btc.fallback")} ↗
            </a>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
