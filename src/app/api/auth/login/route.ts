import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { setAuthCookie } from "@/lib/session";
import { loginSchema } from "@/lib/validation";
import { serializeUser } from "@/lib/serializers";
import { error } from "@/lib/http";

export async function POST(req: NextRequest) {
  const parsed = loginSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error(400, "Enter a valid email and password");
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return error(401, "Invalid email or password");
  }

  await setAuthCookie({
    sub: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
  });

  return NextResponse.json({ user: serializeUser(user) });
}
