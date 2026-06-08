import { NextRequest, NextResponse } from "next/server";
import { checkCredentials, setSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let username = "";
  let password = "";
  try {
    const body = (await req.json()) as { username?: string; password?: string };
    username = body.username ?? "";
    password = body.password ?? "";
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!checkCredentials(username, password)) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  await setSessionCookie();
  return NextResponse.json({ ok: true });
}
