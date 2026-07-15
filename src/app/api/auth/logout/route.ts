import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clearAuthCookie } from "@/lib/session";

export async function POST() {
  await clearAuthCookie();
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  await clearAuthCookie();
  return NextResponse.redirect(new URL("/login", req.url));
}
