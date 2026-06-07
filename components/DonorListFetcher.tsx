"use client";

import SupporterWall from "./SupporterWall";
import { useCampaignStats } from "./StatsProvider";

/** Zeď přispěvatelů s vyhledáváním (stránka Příběh) — data ze sdíleného StatsProvideru. */
export default function DonorListFetcher() {
  const { wall } = useCampaignStats();
  return <SupporterWall wall={wall} search />;
}
