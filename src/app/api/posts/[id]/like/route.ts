import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorSelect, serializeUser } from "@/lib/serializers";
import { error, requireUserId } from "@/lib/http";

type Context = { params: Promise<{ id: string }> };

async function setLike(id: string, meId: string, liked: boolean) {
  const post = await prisma.post.findUnique({
    where: { id },
    select: { authorId: true, visibility: true },
  });
  if (!post || (post.visibility === "PRIVATE" && post.authorId !== meId)) return null;

  const [, counted, preview] = await prisma.$transaction([
    liked
      ? prisma.postLike.createMany({ data: { postId: id, userId: meId }, skipDuplicates: true })
      : prisma.postLike.deleteMany({ where: { postId: id, userId: meId } }),
    prisma.$queryRaw<{ likeCount: number }[]>`
      UPDATE "Post"
      SET "likeCount" = (SELECT count(*)::int FROM "PostLike" WHERE "postId" = ${id})
      WHERE "id" = ${id}
      RETURNING "likeCount"`,
    prisma.postLike.findMany({
      where: { postId: id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { user: { select: authorSelect } },
    }),
  ]);

  return {
    liked,
    likeCount: counted[0].likeCount,
    likePreview: preview.map((l) => serializeUser(l.user)),
  };
}

export async function PUT(_req: NextRequest, { params }: Context) {
  const meId = await requireUserId();
  if (!meId) return error(401, "Unauthorized");
  const { id } = await params;

  const result = await setLike(id, meId, true);
  if (!result) return error(404, "Post not found");
  return NextResponse.json(result);
}

export async function DELETE(_req: NextRequest, { params }: Context) {
  const meId = await requireUserId();
  if (!meId) return error(401, "Unauthorized");
  const { id } = await params;

  const result = await setLike(id, meId, false);
  if (!result) return error(404, "Post not found");
  return NextResponse.json(result);
}
