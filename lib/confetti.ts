import confetti from "canvas-confetti";

export const CONFETTI_KEY = "confetti";

/** Konfety jsou zapnuté, pokud je uživatel nevypnul a nemá omezený pohyb. */
export function confettiEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
  return localStorage.getItem(CONFETTI_KEY) !== "off";
}

const COLORS = ["#f7931a", "#ffb454", "#ffd5a0", "#ffffff"];

/** Oslavná dávka konfet (při příchodu nové platby). */
export function fireConfetti() {
  if (!confettiEnabled()) return;
  confetti({
    particleCount: 90,
    spread: 75,
    startVelocity: 45,
    origin: { x: 0.15, y: 0.7 },
    angle: 60,
    colors: COLORS,
  });
  confetti({
    particleCount: 90,
    spread: 75,
    startVelocity: 45,
    origin: { x: 0.85, y: 0.7 },
    angle: 120,
    colors: COLORS,
  });
}
