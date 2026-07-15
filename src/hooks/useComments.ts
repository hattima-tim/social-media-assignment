"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/client";
import { CommentDTO, Page } from "@/lib/types";

export function useComments(postId: string, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ["comments", postId],
    enabled,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      apiFetch<Page<CommentDTO>>(
        `/api/posts/${postId}/comments${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ""}`,
      ),
    getNextPageParam: (last) => last.nextCursor,
  });
}

export function useReplies(commentId: string, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ["replies", commentId],
    enabled,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      apiFetch<Page<CommentDTO>>(
        `/api/comments/${commentId}/replies${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ""}`,
      ),
    getNextPageParam: (last) => last.nextCursor,
  });
}
