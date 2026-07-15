import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { error, requireUserId } from "@/lib/http";

type Context = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Context) {
  const meId = await requireUserId();
  if (!meId) return error(401, "Unauthorized");
  const { id } = await params;

  const comment = await prisma.comment.findUnique({
    where: { id },
    select: { post: { select: { authorId: true, visibility: true } } },
  });
  if (!comment || (comment.post.visibility === "PRIVATE" && comment.post.authorId !== meId)) {
    return error(404, "Comment not found");
  }

  const existing = await prisma.commentLike.findUnique({
    where: { commentId_userId: { commentId: id, userId: meId } },
    select: { id: true },
  });

  const result = await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.commentLike.delete({ where: { id: existing.id } });
      const c = await tx.comment.update({
        where: { id },
        data: { likeCount: { decrement: 1 } },
        select: { likeCount: true },
      });
      return { liked: false, likeCount: c.likeCount };
    }
    await tx.commentLike.create({ data: { commentId: id, userId: meId } });
    const c = await tx.comment.update({
      where: { id },
      data: { likeCount: { increment: 1 } },
      select: { likeCount: true },
    });
    return { liked: true, likeCount: c.likeCount };
  });

  return NextResponse.json(result);
}
