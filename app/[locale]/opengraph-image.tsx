import { ImageResponse } from "next/og";
import { getStats } from "@/lib/stats";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Satoshi Monument Praha";
// Dynamická karta — náhled při sdílení odráží aktuální stav sbírky.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function fmtBtc(n: number): string {
  return n.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

export default async function OgImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const en = locale === "en";

  let raisedBtc = 0;
  let goalBtc = 1;
  let percent = 0;
  let donorCount = 0;
  try {
    const s = await getStats();
    raisedBtc = s.raisedBtc;
    goalBtc = s.goalBtc;
    percent = s.percent;
    donorCount = s.donorCount;
  } catch {}

  const title = en
    ? "Let's raise a statue of Satoshi in Prague"
    : "Postavme Satoshimu sochu v Praze";
  const raisedLabel = en ? "raised" : "vybráno";
  const donorsLabel = en ? "supporters" : "přispěvatelů";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "radial-gradient(60% 60% at 50% 0%, rgba(247,147,26,0.25) 0%, #0a0a0f 70%)",
          color: "#f5f5f4",
          fontFamily: "sans-serif",
          padding: "70px 80px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 80,
              height: 80,
              borderRadius: 40,
              background: "#f7931a",
              color: "#0a0a0f",
              fontSize: 48,
              fontWeight: 800,
            }}
          >
            B
          </div>
          <div style={{ fontSize: 30, color: "#f7931a", fontWeight: 700 }}>
            Satoshi Monument
          </div>
        </div>

        <div
          style={{ fontSize: 60, fontWeight: 800, lineHeight: 1.05, maxWidth: 1040 }}
        >
          {title}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 28 }}>
            <div style={{ fontSize: 72, fontWeight: 800, color: "#f7931a" }}>
              {`${percent.toFixed(1)} %`}
            </div>
            <div style={{ fontSize: 34, color: "#a1a1aa", paddingBottom: 14 }}>
              {`${fmtBtc(raisedBtc)} / ${goalBtc} BTC ${raisedLabel} · ${donorCount} ${donorsLabel}`}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              width: "100%",
              height: 28,
              borderRadius: 14,
              background: "rgba(255,255,255,0.1)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.max(2, Math.min(100, percent))}%`,
                height: "100%",
                background: "#f7931a",
                borderRadius: 14,
              }}
            />
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
