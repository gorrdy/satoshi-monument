"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useLocaleSwitch } from "./I18nProvider";
import LocaleSwitcher from "./LocaleSwitcher";

// Kotvy na sekce homepage v pořadí výskytu na stránce.
const ANCHORS = ["donate", "wall", "cities", "about"] as const;

/** Sdílená hlavička. onHome=true → kotvy v rámci stránky; jinak odkazy na /{locale}#… */
export default function SiteHeader({ onHome = false }: { onHome?: boolean }) {
  const t = useTranslations("nav");
  const { locale } = useLocaleSwitch();
  const [active, setActive] = useState<string>("");
  const [menuOpen, setMenuOpen] = useState(false);

  const sec = (a: string) => (onHome ? `#${a}` : `/${locale}#${a}`);
  const page = (p: string) => `/${locale}/${p}`;

  // Scroll-spy: zvýrazni kotvu podle sekce, která je zrovna ve výhledu (jen na homepage).
  useEffect(() => {
    if (!onHome) return;
    const els = ANCHORS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (!els.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id);
        }
      },
      // Úzký pás kolem horní třetiny viewportu — sekce, která jím prochází, je aktivní.
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [onHome]);

  return (
    <header className="sticky top-0 z-40 ui-border-b bg-[var(--bg)]/90 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-2 sm:gap-6">
        {/* Vlevo: logo + kotvy na sekce homepage */}
        <a
          href={`/${locale}`}
          className="flex items-center gap-2 sm:gap-2.5 ui-display text-base sm:text-lg font-bold min-w-0"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/bitcoin.webp" alt="Bitcoin" className="w-7 h-7 sm:w-8 sm:h-8 shrink-0" />
          <span className="truncate">Satoshi Monument</span>
        </a>
        <nav className="hidden md:flex items-center gap-4">
          {ANCHORS.map((id) => {
            const isActive = onHome && active === id;
            return (
              <a
                key={id}
                href={sec(id)}
                className={`relative ui-eyebrow ui-link transition-colors ${
                  isActive ? "ui-accent" : ""
                }`}
              >
                <span className="ui-accent">#</span>
                {t(id)}
                {/* Animované podtržení aktivní kotvy */}
                <span
                  aria-hidden
                  className={`absolute left-0 -bottom-1.5 h-0.5 rounded transition-all duration-300 ease-out ${
                    isActive ? "w-full opacity-100" : "w-0 opacity-0"
                  }`}
                  style={{ background: "var(--accent-text)" }}
                />
              </a>
            );
          })}
        </nav>

        {/* Vpravo: samostatné stránky + CTA + přepínač jazyka */}
        <nav className="flex items-center gap-1.5 sm:gap-4 ml-auto shrink-0">
          <a href={page("pravidla")} className="hidden md:inline ui-eyebrow ui-link">
            {t("pravidla")}
          </a>
          <a href={page("pribeh")} className="hidden md:inline ui-eyebrow ui-link">
            {t("pribeh")}
          </a>
          <a href={page("podporovatele")} className="hidden md:inline ui-eyebrow ui-link">
            {t("podporovatele")}
          </a>
          {/* CTA Přispět — na mobilu skryté (dostupné přes hamburger #donate) */}
          <span className="hidden sm:inline-flex">
            <a
              href={sec("donate")}
              className="ui-btn press px-4 py-2 text-sm whitespace-nowrap"
            >
              {t("donate")}
            </a>
          </span>
          <LocaleSwitcher />

          {/* Hamburger — jen na mobilu */}
          <button
            type="button"
            className="md:hidden flex items-center justify-center w-9 h-9 ui-border rounded-[var(--radius-sm)] ui-soft"
            aria-label={t("menu")}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {menuOpen ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <>
                  <path d="M3 6h18" />
                  <path d="M3 12h18" />
                  <path d="M3 18h18" />
                </>
              )}
            </svg>
          </button>
        </nav>
      </div>

      {/* Mobilní rozbalovací menu */}
      {menuOpen && (
        <nav
          id="mobile-menu"
          className="md:hidden ui-border-t bg-[var(--bg)] px-4 py-4 flex flex-col gap-1"
        >
          {ANCHORS.map((id) => (
            <a
              key={id}
              href={sec(id)}
              onClick={() => setMenuOpen(false)}
              className="ui-eyebrow ui-link py-2.5"
            >
              <span className="ui-accent">#</span>
              {t(id)}
            </a>
          ))}
          <span className="ui-border-t my-2" aria-hidden />
          <a
            href={page("pravidla")}
            onClick={() => setMenuOpen(false)}
            className="ui-eyebrow ui-link py-2.5"
          >
            {t("pravidla")}
          </a>
          <a
            href={page("pribeh")}
            onClick={() => setMenuOpen(false)}
            className="ui-eyebrow ui-link py-2.5"
          >
            {t("pribeh")}
          </a>
          <a
            href={page("podporovatele")}
            onClick={() => setMenuOpen(false)}
            className="ui-eyebrow ui-link py-2.5"
          >
            {t("podporovatele")}
          </a>
        </nav>
      )}
    </header>
  );
}
