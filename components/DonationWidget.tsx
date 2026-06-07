"use client";

import { useState } from "react";
import DonationForm from "./DonationForm";
import PaymentModal, { type PaymentResult } from "./PaymentModal";

/**
 * Samostatný darovací widget (formulář + platební modal) pro hero sekci.
 * Po dokončení platby pošle globální událost, na kterou reaguje progress bar.
 */
export default function DonationWidget() {
  const [result, setResult] = useState<PaymentResult | null>(null);

  const refreshStats = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("stats:refresh"));
    }
  };

  return (
    <>
      <DonationForm onResult={(r) => setResult(r)} />
      {result && (
        <PaymentModal
          result={result}
          onClose={() => {
            setResult(null);
            refreshStats();
          }}
          onPaid={refreshStats}
        />
      )}
    </>
  );
}
