import { NextRequest, NextResponse } from "next/server";
import { checkPassword, setSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let password = "";
  try {
    const body = (await req.json()) as { password?: string };
    password = body.password ?? "";
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!checkPassword(password)) {
    return NextResponse.json({ error: "invalid_password" }, { status: 401 });
  }

  await setSessionCookie();
  return NextResponse.json({ ok: true });
}
