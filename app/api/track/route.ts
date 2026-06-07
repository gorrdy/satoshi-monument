import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { isbot } from "isbot";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SITE_HOST = (() => {
  try {
    return new URL(
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://monument.gorrdy.cz",
    ).host;
  } catch {
    return "monument.gorrdy.cz";
  }
})();

function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "0.0.0.0";
}

function referrerHost(ref: string | undefined): string {
  if (!ref) return "direct";
  try {
    const host = new URL(ref).host.replace(/^www\./, "");
    if (!host || host === SITE_HOST) return "direct";
    return host.slice(0, 100);
  } catch {
    return "direct";
  }
}

interface Body {
  path?: string;
  ref?: string;
  locale?: string;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const path = (body.path ?? "/").slice(0, 200);
  // Admin se netrackuje.
  if (/\/admin(\/|$)/.test(path)) return new NextResponse(null, { status: 204 });

  const ua = req.headers.get("user-agent") ?? "";
  const ip = clientIp(req);
  const day = new Date().toISOString().slice(0, 10);
  const salt = process.env.SESSION_SECRET ?? "salt";
  const visitorHash = crypto
    .createHash("sha256")
    .update(`${salt}|${day}|${ip}|${ua}`)
    .digest("hex")
    .slice(0, 16);

  const device = /Mobi|Android|iPhone|iPad|iPod/i.test(ua)
    ? "mobile"
    : "desktop";
  const locale = body.locale === "en" ? "en" : body.locale === "cs" ? "cs" : null;

  try {
    await prisma.pageView.create({
      data: {
        path,
        locale,
        referrer: referrerHost(body.ref),
        device,
        isBot: isbot(ua),
        visitorHash,
      },
    });
  } catch {
    // analytika nesmí shodit nic dalšího
  }

  return new NextResponse(null, { status: 204 });
}
