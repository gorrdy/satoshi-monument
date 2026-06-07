/**
 * Deterministický generativní avatar (identicon) — z daného seedu vykreslí
 * stálý 5×5 symetrický vzor. Čistě inline SVG (bez externích zdrojů → OK s CSP).
 */

// FNV-1a hash → 32bit seed
function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// mulberry32 PRNG
function makeRng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function Identicon({
  seed,
  className = "",
}: {
  seed: string;
  className?: string;
}) {
  const rng = makeRng(hashSeed(seed || "₿"));
  const hue = Math.floor(rng() * 360);
  const fg = `hsl(${hue} 68% 60%)`;
  const bg = `hsl(${hue} 26% 16%)`;

  // 5×5 mřížka, symetrická podle svislé osy → generujeme 3 sloupce (0,1,2).
  const cells: boolean[] = [];
  for (let i = 0; i < 15; i++) cells.push(rng() > 0.5);
  const filled = (col: number, row: number) => {
    const c = col > 2 ? 4 - col : col; // zrcadlení
    return cells[c * 5 + row];
  };

  const rects = [];
  for (let col = 0; col < 5; col++) {
    for (let row = 0; row < 5; row++) {
      if (filled(col, row)) {
        rects.push(
          <rect key={`${col}-${row}`} x={col} y={row} width={1.02} height={1.02} fill={fg} />,
        );
      }
    }
  }

  return (
    <svg
      viewBox="0 0 5 5"
      className={className}
      role="img"
      aria-hidden
      shapeRendering="crispEdges"
    >
      <rect x={0} y={0} width={5} height={5} fill={bg} />
      {rects}
    </svg>
  );
}
