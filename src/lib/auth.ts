import { SignJWT, jwtVerify } from "jose";

export const AUTH_COOKIE = "token";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type SessionPayload = {
  sub: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
};

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(value);
}

export async function signToken(payload: SessionPayload) {
  return new SignJWT({
    firstName: payload.firstName,
    lastName: payload.lastName,
    avatarUrl: payload.avatarUrl,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret());
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      firstName: String(payload.firstName ?? ""),
      lastName: String(payload.lastName ?? ""),
      avatarUrl: (payload.avatarUrl as string | null) ?? null,
    };
  } catch {
    return null;
  }
}

export const cookieMaxAge = MAX_AGE_SECONDS;
