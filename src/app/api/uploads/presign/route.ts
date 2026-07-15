import { NextRequest, NextResponse } from "next/server";
import { presignSchema } from "@/lib/validation";
import { createImageUploadUrl, isAllowedImageType } from "@/lib/storage";
import { error, requireUserId } from "@/lib/http";

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return error(401, "Unauthorized");

  const parsed = presignSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error(400, "Invalid upload request");

  const { contentType } = parsed.data;
  if (!isAllowedImageType(contentType)) return error(400, "Only JPEG, PNG, WebP or GIF images are allowed");

  return NextResponse.json(await createImageUploadUrl(contentType));
}
