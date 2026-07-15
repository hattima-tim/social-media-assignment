import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorSelect, serializeUser } from "@/lib/serializers";
import { error, requireUserId } from "@/lib/http";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return error(401, "Unauthorized");

  const user = await prisma.user.findUnique({ where: { id: userId }, select: authorSelect });
  if (!user) return error(401, "Unauthorized");

  return NextResponse.json({ user: serializeUser(user) });
}
