import { z } from "zod";

export const registerSchema = z.object({
  firstName: z.string().trim().min(1).max(50),
  lastName: z.string().trim().min(1).max(50),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(100),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const createPostSchema = z
  .object({
    content: z.string().trim().max(5000).default(""),
    imageUrl: z.string().url().optional(),
    visibility: z.enum(["PUBLIC", "PRIVATE"]).default("PUBLIC"),
  })
  .refine((v) => v.content.length > 0 || Boolean(v.imageUrl), {
    message: "A post needs text or an image",
    path: ["content"],
  });

export const updatePostSchema = z.object({
  content: z.string().trim().max(5000).optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).optional(),
});

export const createCommentSchema = z.object({
  content: z.string().trim().min(1).max(2000),
  parentId: z.string().min(1).optional(),
});

export const updateCommentSchema = z.object({
  content: z.string().trim().min(1).max(2000),
});

export const presignSchema = z.object({
  contentType: z.string(),
  size: z.number().int().positive().max(5 * 1024 * 1024),
});
