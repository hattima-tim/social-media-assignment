import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export function error(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export async function requireUserId() {
  const session = await getSession();
  return session?.sub ?? null;
}
