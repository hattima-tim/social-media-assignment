import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updatePostSchema } from "@/lib/validation";
import { authorSelect, serializePost } from "@/lib/serializers";
import { error, requireUserId } from "@/lib/http";
import { deleteImage } from "@/lib/storage";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Context) {
  const meId = await requireUserId();
  if (!meId) return error(401, "Unauthorized");
  const { id } = await params;

  const post = await prisma.post.findUnique({ where: { id }, select: { authorId: true } });
  if (!post) return error(404, "Post not found");
  if (post.authorId !== meId) return error(403, "You can only edit your own posts");

  const parsed = updatePostSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error(400, "Invalid update");

  const updated = await prisma.post.update({
    where: { id },
    data: parsed.data,
    include: {
      author: { select: authorSelect },
      likes: { take: 5, orderBy: { createdAt: "desc" }, select: { user: { select: authorSelect } } },
    },
  });

  const myLike = await prisma.postLike.findUnique({
    where: { postId_userId: { postId: id, userId: meId } },
    select: { id: true },
  });

  return NextResponse.json({ post: serializePost(updated, meId, Boolean(myLike)) });
}

export async function DELETE(_req: NextRequest, { params }: Context) {
  const meId = await requireUserId();
  if (!meId) return error(401, "Unauthorized");
  const { id } = await params;

  const post = await prisma.post.findUnique({ where: { id }, select: { authorId: true, imageUrl: true } });
  if (!post) return error(404, "Post not found");
  if (post.authorId !== meId) return error(403, "You can only delete your own posts");

  await prisma.post.delete({ where: { id } });
  if (post.imageUrl) await deleteImage(post.imageUrl);

  return NextResponse.json({ ok: true });
}
