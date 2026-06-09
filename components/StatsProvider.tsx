"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Stats } from "./ProgressBar";
import type { WallEntry } from "./SupporterWall";
import { fireConfetti } from "@/lib/confetti";

interface StatsValue {
  stats: Stats | null;
  wall: WallEntry[];
}

const StatsContext = createContext<StatsValue>({ stats: null, wall: [] });

/** Jeden zdroj dat sbírky pro celou stránku — místo 3 nezávislých fetchů. */
export default function StatsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [wall, setWall] = useState<WallEntry[]>([]);
  // Předchozí vybraná částka — nárůst = právě přišla nová platba → konfety.
  const prevRaised = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/stats", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { stats: Stats; wall: WallEntry[] };
      const raised = data.stats?.raisedBtc ?? 0;
      // Při prvním načtení jen zapamatovat; potom oslavit každý nárůst.
      if (prevRaised.current !== null && raised > prevRaised.current + 1e-9) {
        fireConfetti();
      }
      prevRaised.current = raised;
      setStats(data.stats);
      setWall(data.wall ?? []);
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

  return (
    <StatsContext.Provider value={{ stats, wall }}>
      {children}
    </StatsContext.Provider>
  );
}

export function useCampaignStats(): StatsValue {
  return useContext(StatsContext);
}
