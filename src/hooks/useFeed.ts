"use client";

import { InfiniteData, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { apiFetch } from "@/lib/client";
import { Page, PostDTO } from "@/lib/types";

export const feedKey = ["feed"];

type FeedData = InfiniteData<Page<PostDTO>, string | null>;

export function useFeed() {
  return useInfiniteQuery({
    queryKey: feedKey,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      apiFetch<Page<PostDTO>>(`/api/posts${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ""}`),
    getNextPageParam: (last) => last.nextCursor,
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();

  return useCallback(
    (postId: string, update: (post: PostDTO) => PostDTO) => {
      queryClient.setQueryData<FeedData>(feedKey, (data) => {
        if (!data) return data;
        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            items: page.items.map((p) => (p.id === postId ? update(p) : p)),
          })),
        };
      });
    },
    [queryClient],
  );
}
