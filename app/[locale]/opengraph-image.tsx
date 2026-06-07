import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Satoshi Monument Praha";

export default async function OgImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const title =
    locale === "en"
      ? "Let's raise a statue of Satoshi in Prague"
      : "Postavme Satoshimu sochu v Praze";
  const subtitle =
    locale === "en"
      ? "Prague · 1 of 21 cities · Goal 1 BTC"
      : "Praha · 1 z 21 metropolí · Cíl 1 BTC";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(60% 60% at 50% 20%, rgba(247,147,26,0.25) 0%, #0a0a0f 70%)",
          color: "#f5f5f4",
          fontFamily: "sans-serif",
          padding: "80px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 120,
            height: 120,
            borderRadius: 60,
            background: "#f7931a",
            color: "#0a0a0f",
            fontSize: 72,
            fontWeight: 800,
            marginBottom: 40,
          }}
        >
          B
        </div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            textAlign: "center",
            lineHeight: 1.1,
            maxWidth: 1000,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 32,
            color: "#f7931a",
            marginTop: 30,
          }}
        >
          {subtitle}
        </div>
      </div>
    ),
    { ...size },
  );
}
