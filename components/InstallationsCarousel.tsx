"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";

interface Slide {
  src: string;
  city: { cs: string; en: string };
  country: { cs: string; en: string };
}

const SLIDES: Slide[] = [
  {
    src: "/installations/lugano.webp",
    city: { cs: "Lugano", en: "Lugano" },
    country: { cs: "Švýcarsko", en: "Switzerland" },
  },
  {
    src: "/installations/el-zonte.webp",
    city: { cs: "El Zonte", en: "El Zonte" },
    country: { cs: "Salvador", en: "El Salvador" },
  },
  {
    src: "/installations/tokyo.webp",
    city: { cs: "Tokio", en: "Tokyo" },
    country: { cs: "Japonsko", en: "Japan" },
  },
  {
    src: "/installations/hanoi.webp",
    city: { cs: "Hanoj", en: "Hanoi" },
    country: { cs: "Vietnam", en: "Vietnam" },
  },
];

export default function InstallationsCarousel() {
  const t = useTranslations("cities");
  const locale = useLocale() === "en" ? "en" : "cs";
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const go = useCallback((i: number) => {
    setIndex((i + SLIDES.length) % SLIDES.length);
  }, []);

  // Respekt OS preference: žádné automatické přepínání při omezeném pohybu.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (paused || reduceMotion) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 4500);
    return () => clearInterval(id);
  }, [paused, reduceMotion]);

  return (
    <div
      className="relative w-full max-w-4xl mx-auto"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="ui-card overflow-hidden p-0">
        <div className="relative aspect-[16/10] sm:aspect-[16/9]">
          {SLIDES.map((s, i) => (
            <div
              key={s.src}
              className="absolute inset-0 transition-opacity duration-700"
              style={{ opacity: i === index ? 1 : 0 }}
              aria-hidden={i !== index}
              inert={i !== index}
            >
              <Image
                src={s.src}
                alt={`${s.city[locale]}, ${s.country[locale]}`}
                fill
                sizes="(max-width: 768px) 100vw, 900px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 p-5 sm:p-6">
                <div className="ui-display text-2xl sm:text-3xl font-bold text-white drop-shadow">
                  {s.city[locale]}
                </div>
                <div className="ui-eyebrow text-white/70">{s.country[locale]}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Šipky */}
      <button
        onClick={() => go(index - 1)}
        aria-label="Předchozí"
        className="absolute top-1/2 -translate-y-1/2 left-2 sm:-left-4 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition backdrop-blur"
      >
        ‹
      </button>
      <button
        onClick={() => go(index + 1)}
        aria-label="Další"
        className="absolute top-1/2 -translate-y-1/2 right-2 sm:-right-4 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition backdrop-blur"
      >
        ›
      </button>

      {/* Tečky */}
      <div className="flex justify-center items-center gap-2 mt-4">
        {SLIDES.map((s, i) => {
          const isActive = i === index;
          return (
            <button
              key={s.src}
              onClick={() => go(i)}
              aria-label={s.city[locale]}
              aria-current={isActive}
              className={`h-2 shrink-0 rounded-full transition-[width,opacity] duration-300 ease-out ${
                isActive ? "w-6 opacity-100" : "w-2 opacity-40 hover:opacity-70"
              }`}
              style={{ background: "var(--accent)" }}
            />
          );
        })}
      </div>

      <p className="text-center ui-muted text-sm mt-4">{t("caption")}</p>
    </div>
  );
}
