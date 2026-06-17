import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import path from "path";
import { getStats } from "@/lib/stats";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Satoshi Monument v Praze";
// Dynamická karta — náhled při sdílení (foto sochy + nadpis + živý stav).
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Verze OG karty → mění URL og:image (cache-bust pro sociální sítě).
// Bump při výměně fotky/designu, ať si scrapery stáhnou nový náhled.
export function generateImageMetadata() {
  return [{ id: "v3", size, contentType, alt }];
}

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

  let percent = 0;
  let raisedBtc = 0;
  let goalBtc = 1;
  let donorCount = 0;
  try {
    const s = await getStats();
    percent = s.percent;
    raisedBtc = s.raisedBtc;
    goalBtc = s.goalBtc;
    donorCount = s.donorCount;
  } catch {}

  // Foto sochy jako pozadí (JPEG → data URI; satori neumí webp).
  let heroSrc = "";
  try {
    const buf = await readFile(path.join(process.cwd(), "public/og-hero.jpg"));
    heroSrc = `data:image/jpeg;base64,${buf.toString("base64")}`;
  } catch {}

  const title = en ? "Satoshi Monument in Prague" : "Satoshi Monument v Praze";
  const raisedLabel = en ? "raised" : "vybráno";
  const donorsLabel = en ? "supporters" : "přispěvatelů";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          fontFamily: "sans-serif",
          color: "#f5f5f4",
        }}
      >
        {/* Foto sochy na pozadí */}
        {heroSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroSrc}
            width={1200}
            height={630}
            style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 630, objectFit: "cover" }}
          />
        ) : null}
        {/* Ztmavení pro čitelnost */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "linear-gradient(to top, rgba(8,8,11,0.92) 0%, rgba(8,8,11,0.35) 55%, rgba(8,8,11,0.15) 100%)",
          }}
        />
        {/* Obsah */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            width: "100%",
            height: "100%",
            padding: "64px 70px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 16 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 56,
                height: 56,
                borderRadius: 28,
                background: "#f7931a",
                color: "#0a0a0f",
                fontSize: 34,
                fontWeight: 800,
              }}
            >
              B
            </div>
            <div style={{ fontSize: 26, color: "#f7931a", fontWeight: 700 }}>
              {en ? "Community Bitcoin fundraiser" : "Komunitní bitcoinová sbírka"}
            </div>
          </div>

          <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.02 }}>
            {title}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 22 }}>
            <div style={{ fontSize: 40, fontWeight: 800, color: "#f7931a" }}>
              {`${percent.toFixed(1)} %`}
            </div>
            <div style={{ fontSize: 28, color: "#e5e5e5" }}>
              {`${fmtBtc(raisedBtc)} / ${goalBtc} BTC ${raisedLabel} · ${donorCount} ${donorsLabel}`}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
