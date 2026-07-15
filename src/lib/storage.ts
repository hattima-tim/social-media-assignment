import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const endpoint = process.env.S3_ENDPOINT || undefined;
const bucket = process.env.S3_BUCKET!;
const publicBase = process.env.S3_PUBLIC_BASE_URL!.replace(/\/$/, "");

const s3 = new S3Client({
  region: process.env.S3_REGION || "us-east-1",
  endpoint,
  forcePathStyle: Boolean(endpoint),
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
});

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function isAllowedImageType(contentType: string) {
  return contentType in EXTENSIONS;
}

export async function createImageUploadUrl(contentType: string) {
  const key = `uploads/${crypto.randomUUID()}.${EXTENSIONS[contentType]}`;
  const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 });
  return { uploadUrl, publicUrl: `${publicBase}/${key}` };
}

export function isManagedImageUrl(url: string) {
  return url.startsWith(`${publicBase}/uploads/`);
}

export async function deleteImage(url: string) {
  if (!isManagedImageUrl(url)) return;
  const key = url.slice(publicBase.length + 1);
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
