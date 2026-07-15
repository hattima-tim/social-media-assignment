import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorSelect, serializeUser } from "@/lib/serializers";
import { error, requireUserId } from "@/lib/http";

type Context = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Context) {
  const meId = await requireUserId();
  if (!meId) return error(401, "Unauthorized");
  const { id } = await params;

  const post = await prisma.post.findUnique({ where: { id }, select: { authorId: true, visibility: true } });
  if (!post || (post.visibility === "PRIVATE" && post.authorId !== meId)) return error(404, "Post not found");

  const likes = await prisma.postLike.findMany({
    where: { postId: id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: authorSelect } },
  });

  return NextResponse.json({ users: likes.map((l) => serializeUser(l.user)) });
}
