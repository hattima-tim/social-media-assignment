import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { error, requireUserId } from "@/lib/http";

type Context = { params: Promise<{ id: string }> };

async function setLike(id: string, meId: string, liked: boolean) {
  const comment = await prisma.comment.findUnique({
    where: { id },
    select: { post: { select: { authorId: true, visibility: true } } },
  });
  if (!comment || (comment.post.visibility === "PRIVATE" && comment.post.authorId !== meId)) {
    return null;
  }

  const [, counted] = await prisma.$transaction([
    liked
      ? prisma.commentLike.createMany({ data: { commentId: id, userId: meId }, skipDuplicates: true })
      : prisma.commentLike.deleteMany({ where: { commentId: id, userId: meId } }),
    prisma.$queryRaw<{ likeCount: number }[]>`
      UPDATE "Comment"
      SET "likeCount" = (SELECT count(*)::int FROM "CommentLike" WHERE "commentId" = ${id})
      WHERE "id" = ${id}
      RETURNING "likeCount"`,
  ]);

  return { liked, likeCount: counted[0].likeCount };
}

export async function PUT(_req: NextRequest, { params }: Context) {
  const meId = await requireUserId();
  if (!meId) return error(401, "Unauthorized");
  const { id } = await params;

  const result = await setLike(id, meId, true);
  if (!result) return error(404, "Comment not found");
  return NextResponse.json(result);
}

export async function DELETE(_req: NextRequest, { params }: Context) {
  const meId = await requireUserId();
  if (!meId) return error(401, "Unauthorized");
  const { id } = await params;

  const result = await setLike(id, meId, false);
  if (!result) return error(404, "Comment not found");
  return NextResponse.json(result);
}
