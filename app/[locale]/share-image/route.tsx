import { ImageResponse } from "next/og";
import QRCode from "qrcode";
import { getStats } from "@/lib/stats";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://satoshi.jednadvacet.org";

function fmtBtc(n: number): string {
  return n.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

/**
 * Čtvercový obrázek (1080×1080) se stavem sbírky + QR na web.
 * Ke stažení/sdílení na sítě (story, IG…). /{locale}/share-image
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  const en = locale === "en";
  const url = `${SITE}/${locale}`;

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

  // QR jako data URL (bílé na průhledném → na světlé dlaždici).
  const qr = await QRCode.toDataURL(url, {
    margin: 1,
    width: 300,
    color: { dark: "#0a0a0f", light: "#ffffff" },
  });

  const title = en
    ? "Let's raise a statue of Satoshi in Prague"
    : "Postavme Satoshimu sochu v Praze";
  const raisedLabel = en ? "raised" : "vybráno";
  const donorsLabel = en ? "supporters" : "přispěvatelů";
  const scan = en ? "Scan & contribute" : "Naskenuj a přispěj";

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
            "radial-gradient(70% 50% at 50% 0%, rgba(247,147,26,0.28) 0%, #0a0a0f 70%)",
          color: "#f5f5f4",
          fontFamily: "sans-serif",
          padding: "80px",
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 84,
              height: 84,
              borderRadius: 42,
              background: "#f7931a",
              color: "#0a0a0f",
              fontSize: 50,
              fontWeight: 800,
            }}
          >
            B
          </div>
          <div style={{ fontSize: 36, color: "#f7931a", fontWeight: 700 }}>
            Satoshi Monument
          </div>
        </div>

        <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.05 }}>
          {title}
        </div>

        {/* Stav */}
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ fontSize: 110, fontWeight: 800, color: "#f7931a" }}>
            {`${percent.toFixed(1)} %`}
          </div>
          <div style={{ fontSize: 40, color: "#a1a1aa" }}>
            {`${fmtBtc(raisedBtc)} / ${goalBtc} BTC ${raisedLabel} · ${donorCount} ${donorsLabel}`}
          </div>
          <div
            style={{
              display: "flex",
              width: "100%",
              height: 32,
              borderRadius: 16,
              background: "rgba(255,255,255,0.1)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.max(2, Math.min(100, percent))}%`,
                height: "100%",
                background: "#f7931a",
                borderRadius: 16,
              }}
            />
          </div>
        </div>

        {/* QR + URL */}
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qr}
            width={160}
            height={160}
            style={{ borderRadius: 12, background: "#fff", padding: 8 }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 34, fontWeight: 700 }}>{scan}</div>
            <div style={{ fontSize: 30, color: "#f7931a" }}>
              {url.replace(/^https?:\/\//, "")}
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1080 },
  );
}
