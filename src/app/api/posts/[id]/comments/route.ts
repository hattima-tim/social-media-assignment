import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createCommentSchema } from "@/lib/validation";
import { authorSelect, serializeComment } from "@/lib/serializers";
import { error, requireUserId } from "@/lib/http";

type Context = { params: Promise<{ id: string }> };

const PAGE_SIZE = 10;

async function visiblePost(id: string, meId: string) {
  const post = await prisma.post.findUnique({ where: { id }, select: { authorId: true, visibility: true } });
  if (!post) return null;
  if (post.visibility === "PRIVATE" && post.authorId !== meId) return null;
  return post;
}

export async function GET(req: NextRequest, { params }: Context) {
  const meId = await requireUserId();
  if (!meId) return error(401, "Unauthorized");
  const { id } = await params;
  if (!(await visiblePost(id, meId))) return error(404, "Post not found");

  const cursor = new URL(req.url).searchParams.get("cursor");
  const rows = await prisma.comment.findMany({
    where: { postId: id, parentId: null },
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

export async function POST(req: NextRequest, { params }: Context) {
  const meId = await requireUserId();
  if (!meId) return error(401, "Unauthorized");
  const { id } = await params;
  if (!(await visiblePost(id, meId))) return error(404, "Post not found");

  const parsed = createCommentSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error(400, "Write something to comment");

  const { content, parentId } = parsed.data;
  if (parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: parentId },
      select: { postId: true, parentId: true },
    });
    if (!parent || parent.postId !== id || parent.parentId !== null) {
      return error(400, "Invalid reply target");
    }
  }

  const comment = await prisma.$transaction(async (tx) => {
    const created = await tx.comment.create({
      data: { postId: id, authorId: meId, content, parentId: parentId ?? null },
      include: {
        author: { select: authorSelect },
        likes: { where: { userId: meId }, select: { id: true } },
      },
    });
    await tx.post.update({ where: { id }, data: { commentCount: { increment: 1 } } });
    if (parentId) {
      await tx.comment.update({ where: { id: parentId }, data: { replyCount: { increment: 1 } } });
    }
    return created;
  });

  return NextResponse.json({ comment: serializeComment(comment, meId) }, { status: 201 });
}
