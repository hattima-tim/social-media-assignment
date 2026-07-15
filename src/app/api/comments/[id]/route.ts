import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateCommentSchema } from "@/lib/validation";
import { authorSelect, serializeComment } from "@/lib/serializers";
import { error, requireUserId } from "@/lib/http";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Context) {
  const meId = await requireUserId();
  if (!meId) return error(401, "Unauthorized");
  const { id } = await params;

  const comment = await prisma.comment.findUnique({ where: { id }, select: { authorId: true } });
  if (!comment) return error(404, "Comment not found");
  if (comment.authorId !== meId) return error(403, "You can only edit your own comments");

  const parsed = updateCommentSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error(400, "Write something to comment");

  const updated = await prisma.comment.update({
    where: { id },
    data: { content: parsed.data.content },
    include: {
      author: { select: authorSelect },
      likes: { where: { userId: meId }, select: { id: true } },
    },
  });

  return NextResponse.json({ comment: serializeComment(updated, meId) });
}

export async function DELETE(_req: NextRequest, { params }: Context) {
  const meId = await requireUserId();
  if (!meId) return error(401, "Unauthorized");
  const { id } = await params;

  const comment = await prisma.comment.findUnique({
    where: { id },
    select: { authorId: true, postId: true, parentId: true, replyCount: true },
  });
  if (!comment) return error(404, "Comment not found");
  if (comment.authorId !== meId) return error(403, "You can only delete your own comments");

  await prisma.$transaction(async (tx) => {
    await tx.comment.delete({ where: { id } });
    const removed = comment.parentId ? 1 : 1 + comment.replyCount;
    await tx.post.update({ where: { id: comment.postId }, data: { commentCount: { decrement: removed } } });
    if (comment.parentId) {
      await tx.comment.update({ where: { id: comment.parentId }, data: { replyCount: { decrement: 1 } } });
    }
  });

  return NextResponse.json({ ok: true });
}
