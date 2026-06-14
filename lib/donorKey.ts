/**
 * Normalizace identifikátoru pro párování/seskupování plateb (`donorKey`).
 *
 * Cíl: drobné rozdíly v zápisu nerozdělí jednoho přispěvatele na víc.
 * - ořez mezer na krajích
 * - složení diakritiky (š → s, é → e, …) → diakritika nerozhoduje
 * - malá písmena → velikost nerozhoduje
 * - max 120 znaků
 *
 * Příklad: "Jednadvacet-Šumperk " → "jednadvacet-sumperk"
 */
export function normalizeDonorKey(raw: string | null | undefined): string | null {
  const v = (raw ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // odstranění diakritických znamének
    .toLowerCase()
    .trim()
    .slice(0, 120);
  return v || null;
}
