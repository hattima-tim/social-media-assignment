import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPostSchema } from "@/lib/validation";
import { isManagedImageUrl } from "@/lib/storage";
import { authorSelect, serializePost } from "@/lib/serializers";
import { error, requireUserId } from "@/lib/http";

const PAGE_SIZE = 10;

export async function GET(req: NextRequest) {
  const meId = await requireUserId();
  if (!meId) return error(401, "Unauthorized");

  const cursor = new URL(req.url).searchParams.get("cursor");

  const rows = await prisma.post.findMany({
    where: { OR: [{ visibility: "PUBLIC" }, { authorId: meId }] },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      author: { select: authorSelect },
      likes: { take: 5, orderBy: { createdAt: "desc" }, select: { user: { select: authorSelect } } },
    },
  });

  const hasMore = rows.length > PAGE_SIZE;
  const pageRows = hasMore ? rows.slice(0, PAGE_SIZE) : rows;

  const myLikes = await prisma.postLike.findMany({
    where: { userId: meId, postId: { in: pageRows.map((p) => p.id) } },
    select: { postId: true },
  });
  const likedByMe = new Set(myLikes.map((l) => l.postId));

  const items = pageRows.map((p) => serializePost(p, meId, likedByMe.has(p.id)));
  return NextResponse.json({ items, nextCursor: hasMore ? items[items.length - 1].id : null });
}

export async function POST(req: NextRequest) {
  const meId = await requireUserId();
  if (!meId) return error(401, "Unauthorized");

  const parsed = createPostSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error(400, parsed.error.issues[0]?.message ?? "Invalid post");

  const { content, imageUrl, visibility } = parsed.data;
  if (imageUrl && !isManagedImageUrl(imageUrl)) return error(400, "Invalid image");

  const post = await prisma.post.create({
    data: { authorId: meId, content, imageUrl: imageUrl ?? null, visibility },
    include: {
      author: { select: authorSelect },
      likes: { take: 5, orderBy: { createdAt: "desc" }, select: { user: { select: authorSelect } } },
    },
  });

  return NextResponse.json({ post: serializePost(post, meId, false) }, { status: 201 });
}
