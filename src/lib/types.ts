export type Visibility = "PUBLIC" | "PRIVATE";

export type UserDTO = {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
};

export type PostDTO = {
  id: string;
  content: string;
  imageUrl: string | null;
  visibility: Visibility;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  likePreview: UserDTO[];
  isMine: boolean;
  author: UserDTO;
};

export type CommentDTO = {
  id: string;
  postId: string;
  parentId: string | null;
  content: string;
  createdAt: string;
  likeCount: number;
  replyCount: number;
  likedByMe: boolean;
  isMine: boolean;
  author: UserDTO;
};

export type Page<T> = {
  items: T[];
  nextCursor: string | null;
};
