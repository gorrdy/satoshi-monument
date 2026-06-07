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
  `img-src 'self' data: blob: ${btcpayOrigin}`.trim(),
  "font-src 'self'",
  `connect-src 'self' ${btcpayOrigin}`.trim(),
  `frame-src ${btcpayOrigin || "'none'"}`.trim(),
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
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
