"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import type { Stats } from "./ProgressBar";
import type { WallEntry } from "./SupporterWall";
import type { RecentDonation, PendingDonation } from "@/lib/stats";
import { fireConfetti } from "@/lib/confetti";

interface StatsValue {
  stats: Stats | null;
  wall: WallEntry[];
  recent: RecentDonation[];
  pending: PendingDonation[];
}

const StatsContext = createContext<StatsValue>({
  stats: null,
  wall: [],
  recent: [],
  pending: [],
});

/** Jeden zdroj dat sbírky pro celou stránku — místo 3 nezávislých fetchů. */
export default function StatsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [wall, setWall] = useState<WallEntry[]>([]);
  const [recent, setRecent] = useState<RecentDonation[]>([]);
  const [pending, setPending] = useState<PendingDonation[]>([]);
  // Testovací override vybrané částky (jen klient, z konzole) — odsimuluje stav sbírky.
  const [simRaised, setSimRaised] = useState<number | null>(null);
  // Předchozí vybraná částka — nárůst = právě přišla nová platba → konfety.
  const prevRaised = useRef<number | null>(null);
  // Aktuální cesta v refu (refresh je stabilní callback) — v adminu konfety nechceme.
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/stats", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        stats: Stats;
        wall: WallEntry[];
        recent: RecentDonation[];
        pending: PendingDonation[];
      };
      const raised = data.stats?.raisedBtc ?? 0;
      // Při prvním načtení jen zapamatovat; potom oslavit každý nárůst.
      // V admin části konfety nespouštíme.
      const inAdmin = (pathRef.current ?? "").includes("/admin");
      if (
        !inAdmin &&
        prevRaised.current !== null &&
        raised > prevRaised.current + 1e-9
      ) {
        fireConfetti();
      }
      prevRaised.current = raised;
      setStats(data.stats);
      setWall(data.wall ?? []);
      setRecent(data.recent ?? []);
      setPending(data.pending ?? []);
    } catch {}
  }, []);

  useEffect(() => {
    refresh();
    // Polling jen když je záložka viditelná (šetří požadavky i baterii).
    const interval = setInterval(() => {
      if (!document.hidden) refresh();
    }, 30_000);
    const onVisible = () => {
      if (!document.hidden) refresh();
    };
    window.addEventListener("focus", onVisible);
    window.addEventListener("stats:refresh", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("stats:refresh", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  // Testovací přepínač z konzole prohlížeče:
  //   simulateRaised(1.05) → odsimuluje 1,05 BTC vybráno (cíl se prodlouží na 1,3,
  //                          progress bar/hero přepočítá, banner naskočí)
  //   simulateRaised(null) → zpět na reálná data
  useEffect(() => {
    const w = window as unknown as { simulateRaised?: (btc: number | null) => void };
    w.simulateRaised = (btc) =>
      setSimRaised(typeof btc === "number" && isFinite(btc) ? btc : null);
    return () => {
      delete w.simulateRaised;
    };
  }, []);

  // Efektivní stav: při testovacím override přepočítáme cíl/procenta klientsky
  // (stejná pravidla jako getStats: základ 1 BTC → po dosažení prodloužení na 1,3).
  const effStats: Stats | null =
    simRaised != null && stats
      ? (() => {
          const raisedBtc = simRaised;
          const goalReached = raisedBtc >= 1;
          const goalBtc = goalReached ? 1.3 : 1;
          const percent = Math.min(100, (raisedBtc / goalBtc) * 100);
          return {
            ...stats,
            raisedBtc,
            goalReached,
            goalBtc,
            percent,
            raisedCzk: raisedBtc * stats.btcCzkRate,
            raisedUsd: raisedBtc * stats.btcUsdRate,
          };
        })()
      : stats;

  return (
    <StatsContext.Provider value={{ stats: effStats, wall, recent, pending }}>
      {children}
    </StatsContext.Provider>
  );
}

export function useCampaignStats(): StatsValue {
  return useContext(StatsContext);
}
