import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorSelect, serializeUser } from "@/lib/serializers";
import { error, requireUserId } from "@/lib/http";

type Context = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Context) {
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

  const likes = await prisma.commentLike.findMany({
    where: { commentId: id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: authorSelect } },
  });

  return NextResponse.json({ users: likes.map((l) => serializeUser(l.user)) });
}
