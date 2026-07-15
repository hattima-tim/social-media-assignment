import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { setAuthCookie } from "@/lib/session";
import { registerSchema } from "@/lib/validation";
import { serializeUser } from "@/lib/serializers";
import { error } from "@/lib/http";

export async function POST(req: NextRequest) {
  const parsed = registerSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error(400, "Please check your details and try again");
  const { firstName, lastName, email, password } = parsed.data;

  if (await prisma.user.findUnique({ where: { email } })) {
    return error(409, "An account with this email already exists");
  }

  const user = await prisma.user.create({
    data: { firstName, lastName, email, passwordHash: await hashPassword(password) },
  });

  await setAuthCookie({
    sub: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
  });

  return NextResponse.json({ user: serializeUser(user) }, { status: 201 });
}
