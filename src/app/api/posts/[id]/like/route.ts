import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { error, requireUserId } from "@/lib/http";

type Context = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Context) {
  const meId = await requireUserId();
  if (!meId) return error(401, "Unauthorized");
  const { id } = await params;

  const post = await prisma.post.findUnique({ where: { id }, select: { authorId: true, visibility: true } });
  if (!post || (post.visibility === "PRIVATE" && post.authorId !== meId)) return error(404, "Post not found");

  const existing = await prisma.postLike.findUnique({
    where: { postId_userId: { postId: id, userId: meId } },
    select: { id: true },
  });

  const result = await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.postLike.delete({ where: { id: existing.id } });
      const p = await tx.post.update({
        where: { id },
        data: { likeCount: { decrement: 1 } },
        select: { likeCount: true },
      });
      return { liked: false, likeCount: p.likeCount };
    }
    await tx.postLike.create({ data: { postId: id, userId: meId } });
    const p = await tx.post.update({
      where: { id },
      data: { likeCount: { increment: 1 } },
      select: { likeCount: true },
    });
    return { liked: true, likeCount: p.likeCount };
  });

  return NextResponse.json(result);
}
