"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { Stats } from "./ProgressBar";
import type { WallEntry } from "./SupporterWall";

export interface RecentPayment {
  name: string;
  amountBtc: number;
  currency: string;
  amount: number;
  createdAt: string;
}

interface StatsValue {
  stats: Stats | null;
  wall: WallEntry[];
  recent: RecentPayment[];
}

const StatsContext = createContext<StatsValue>({
  stats: null,
  wall: [],
  recent: [],
});

/** Jeden zdroj dat sbírky pro celou stránku — místo 3 nezávislých fetchů. */
export default function StatsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [wall, setWall] = useState<WallEntry[]>([]);
  const [recent, setRecent] = useState<RecentPayment[]>([]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/stats", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        stats: Stats;
        wall: WallEntry[];
        recent: RecentPayment[];
      };
      setStats(data.stats);
      setWall(data.wall ?? []);
      setRecent(data.recent ?? []);
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
    <StatsContext.Provider value={{ stats, wall, recent }}>
      {children}
    </StatsContext.Provider>
  );
}

export function useCampaignStats(): StatsValue {
  return useContext(StatsContext);
}
