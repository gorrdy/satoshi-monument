"use client";

import { useMemo, useState } from "react";

const CAMPAIGN_START_YM = "2026-05";
const CZ_MONTHS = [
  "leden", "únor", "březen", "duben", "květen", "červen",
  "červenec", "srpen", "září", "říjen", "listopad", "prosinec",
];

/** Seznam měsíců od začátku sbírky po aktuální (včetně) jako YYYY-MM. */
function monthList(): string[] {
  const [sy, sm] = CAMPAIGN_START_YM.split("-").map(Number);
  const now = new Date();
  const out: string[] = [];
  let y = sy;
  let m = sm; // 1-12
  while (y < now.getUTCFullYear() || (y === now.getUTCFullYear() && m <= now.getUTCMonth() + 1)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return out.reverse(); // nejnovější první
}

function label(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const now = new Date();
  const isCurrent = y === now.getUTCFullYear() && m === now.getUTCMonth() + 1;
  return `${CZ_MONTHS[m - 1]} ${y}${isCurrent ? " (probíhá)" : ""}`;
}

export default function AdminExportPanel() {
  const months = useMemo(monthList, []);
  // Default = poslední dokončený měsíc (druhý v seznamu, pokud první je „probíhá").
  const now = new Date();
  const currentYm = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const defaultMonth = months.find((m) => m !== currentYm) ?? months[0];
  const [month, setMonth] = useState(defaultMonth);

  const href = `/api/admin/export/contributions?month=${month}`;

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-semibold mb-1">Účetní export příspěvků</h2>
      <p className="text-sm text-white/60 mb-5">
        CSV s potvrzenými <strong>BTC</strong> příspěvky přijatými <strong>do konce
        zvoleného měsíce</strong> — datum, částka BTC, kurz BTC v den přijetí a
        hodnota v CZK. CZK (bankovní) platby v CSV nejsou — ty jsou doložené
        oficiálními bankovními výpisy. Otevře se přímo v Excelu (UTF-8, oddělovač „;").
      </p>

      <div className="flex flex-wrap items-end gap-3 mb-5">
        <label className="text-sm">
          <span className="block text-white/50 mb-1">Období (do konce měsíce)</span>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="bg-white/10 border border-white/15 rounded-lg px-3 py-2 text-sm min-w-48"
          >
            {months.map((m) => (
              <option key={m} value={m} className="bg-neutral-900">
                {label(m)}
              </option>
            ))}
          </select>
        </label>

        <a
          href={href}
          download
          className="bg-white/15 hover:bg-white/25 transition-colors rounded-lg px-4 py-2 text-sm font-medium"
        >
          Stáhnout CSV ↓
        </a>
      </div>

      <div className="text-xs text-white/40 leading-relaxed space-y-1">
        <p>
          <strong>Ocenění:</strong> BTC dary přepočteny <strong>denním tržním kurzem
          BTC/CZK ke dni přijetí</strong> (zdroj CoinGecko) — orientační; účetní může
          nahradit oficiálním kurzem (např. ČNB).
        </p>
      </div>
    </div>
  );
}
