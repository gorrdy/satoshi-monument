"use client";

import { useEffect } from "react";

/** Neviditelný beacon — pošle anonymní záznam návštěvy na /api/track. Bez cookies. */
export default function Tracker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const path = window.location.pathname;
    if (/\/admin(\/|$)/.test(path)) return; // admin netrackujeme
    // Respektuj Do Not Track.
    if (navigator.doNotTrack === "1") return;

    const payload = JSON.stringify({
      path,
      ref: document.referrer || "",
      locale: document.documentElement.lang || undefined,
    });

    try {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* ignore */
    }
  }, []);

  return null;
}
