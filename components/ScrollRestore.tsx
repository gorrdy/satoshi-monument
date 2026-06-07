"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Zachová pozici scrollu při refreshi i při přepnutí jazyka.
 * Klíč je nezávislý na jazyce (strhne se prefix /cs|/en), takže /cs a /en
 * sdílí stejnou uloženou pozici. Kotvy (#…) se neřeší (nechá je prohlížeč).
 */
function keyFor(path: string): string {
  const stripped = path.replace(/^\/(cs|en)(?=\/|$)/, "") || "/";
  return "scroll:" + stripped;
}

export default function ScrollRestore() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";

    const KEY = keyFor(pathname || "/");

    if (!window.location.hash) {
      const saved = sessionStorage.getItem(KEY);
      if (saved != null) {
        const y = parseInt(saved, 10) || 0;
        const jump = () => {
          const html = document.documentElement;
          const prev = html.style.scrollBehavior;
          html.style.scrollBehavior = "auto";
          window.scrollTo(0, y);
          html.style.scrollBehavior = prev;
        };
        jump();
        requestAnimationFrame(jump);
        setTimeout(jump, 120);
      }
    }

    let tmr: ReturnType<typeof setTimeout>;
    const save = () =>
      sessionStorage.setItem(KEY, String(Math.round(window.scrollY)));
    const onScroll = () => {
      clearTimeout(tmr);
      tmr = setTimeout(save, 120);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", save);
    window.addEventListener("beforeunload", save);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", save);
      window.removeEventListener("beforeunload", save);
    };
  }, [pathname]);

  return null;
}
