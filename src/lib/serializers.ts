import { CommentDTO, PostDTO, UserDTO, Visibility } from "@/lib/types";

type Author = { id: string; firstName: string; lastName: string; avatarUrl: string | null };

type PostRow = {
  id: string;
  authorId: string;
  content: string;
  imageUrl: string | null;
  visibility: Visibility;
  createdAt: Date;
  likeCount: number;
  commentCount: number;
  author: Author;
  likes: { user: Author }[];
};

type CommentRow = {
  id: string;
  postId: string;
  parentId: string | null;
  authorId: string;
  content: string;
  createdAt: Date;
  likeCount: number;
  replyCount: number;
  author: Author;
  likes: { id: string }[];
};

export function serializeUser(user: Author): UserDTO {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
  };
}

export function serializePost(post: PostRow, meId: string, likedByMe: boolean): PostDTO {
  return {
    id: post.id,
    content: post.content,
    imageUrl: post.imageUrl,
    visibility: post.visibility,
    createdAt: post.createdAt.toISOString(),
    likeCount: post.likeCount,
    commentCount: post.commentCount,
    likedByMe,
    likePreview: post.likes.map((like) => serializeUser(like.user)),
    isMine: post.authorId === meId,
    author: serializeUser(post.author),
  };
}

export function serializeComment(comment: CommentRow, meId: string): CommentDTO {
  return {
    id: comment.id,
    postId: comment.postId,
    parentId: comment.parentId,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
    likeCount: comment.likeCount,
    replyCount: comment.replyCount,
    likedByMe: comment.likes.length > 0,
    isMine: comment.authorId === meId,
    author: serializeUser(comment.author),
  };
}

export const authorSelect = {
  id: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
} as const;
