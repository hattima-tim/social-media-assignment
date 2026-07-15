import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorSelect, serializeComment } from "@/lib/serializers";
import { error, requireUserId } from "@/lib/http";

type Context = { params: Promise<{ id: string }> };

const PAGE_SIZE = 10;

export async function GET(req: NextRequest, { params }: Context) {
  const meId = await requireUserId();
  if (!meId) return error(401, "Unauthorized");
  const { id } = await params;

  const parent = await prisma.comment.findUnique({
    where: { id },
    select: { post: { select: { authorId: true, visibility: true } } },
  });
  if (!parent || (parent.post.visibility === "PRIVATE" && parent.post.authorId !== meId)) {
    return error(404, "Comment not found");
  }

  const cursor = new URL(req.url).searchParams.get("cursor");
  const rows = await prisma.comment.findMany({
    where: { parentId: id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      author: { select: authorSelect },
      likes: { where: { userId: meId }, select: { id: true } },
    },
  });

  const hasMore = rows.length > PAGE_SIZE;
  const items = (hasMore ? rows.slice(0, PAGE_SIZE) : rows).map((c) => serializeComment(c, meId));
  return NextResponse.json({ items, nextCursor: hasMore ? items[items.length - 1].id : null });
}
