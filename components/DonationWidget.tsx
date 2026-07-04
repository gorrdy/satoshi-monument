"use client";

import { useCallback, useState } from "react";
import DonationForm from "./DonationForm";
import PaymentModal, { type PaymentResult } from "./PaymentModal";

/**
 * Samostatný darovací widget (formulář + platební modal) pro hero sekci.
 * Po dokončení platby pošle globální událost, na kterou reaguje progress bar.
 */
export default function DonationWidget({
  kind = "monument",
}: {
  kind?: "monument" | "supporters";
}) {
  const [result, setResult] = useState<PaymentResult | null>(null);

  const refreshStats = useCallback(() => {
    if (typeof window !== "undefined") {
      // monument poslouchá StatsProvider; supporters svůj vlastní listener.
      window.dispatchEvent(new Event("stats:refresh"));
      window.dispatchEvent(new Event("supporters:refresh"));
    }
  }, []);

  const handleClose = useCallback(() => {
    setResult(null);
    refreshStats();
  }, [refreshStats]);

  return (
    <>
      <DonationForm onResult={(r) => setResult(r)} kind={kind} />
      {result && (
        <PaymentModal result={result} onClose={handleClose} onPaid={refreshStats} />
      )}
    </>
  );
}
