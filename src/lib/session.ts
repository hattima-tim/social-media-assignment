import { cookies } from "next/headers";
import { AUTH_COOKIE, SessionPayload, cookieMaxAge, signToken, verifyToken } from "@/lib/auth";

export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function setAuthCookie(payload: SessionPayload) {
  const token = await signToken(payload);
  (await cookies()).set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: cookieMaxAge,
  });
}

export async function clearAuthCookie() {
  (await cookies()).delete(AUTH_COOKIE);
}
