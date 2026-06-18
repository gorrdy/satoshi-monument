import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

// Origin BTCPay serveru (modal skript + iframe platby) pro CSP.
const btcpayOrigin = process.env.BTCPAY_URL
  ? new URL(process.env.BTCPAY_URL).origin
  : "";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${btcpayOrigin}`.trim(),
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https: ${btcpayOrigin}`.trim(),
  "font-src 'self'",
  "worker-src 'self' blob:", // canvas-confetti (Web Worker přes blob: URL)
  `connect-src 'self' ${btcpayOrigin}`.trim(),
  // 'self' kvůli vloženému PDF reportu (/[locale]/report → iframe /api/report).
  `frame-src 'self' ${btcpayOrigin}`.trim(),
  "base-uri 'self'",
  "form-action 'self'",
  // 'self' (ne 'none') — povolí vlastní stránce vložit náš obsah (PDF report),
  // cizí weby nás stále zarámovat nemohou (ochrana proti clickjackingu).
  "frame-ancestors 'self'",
]
  .join("; ")
  .replace(/\s+/g, " ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
