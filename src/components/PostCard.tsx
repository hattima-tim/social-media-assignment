"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { apiFetch } from "@/lib/client";
import { PostDTO, UserDTO, Visibility } from "@/lib/types";
import { timeAgo } from "@/lib/time";
import { feedKey, useUpdatePost } from "@/hooks/useFeed";
import { useMe } from "./me-context";
import { Avatar } from "./Avatar";
import { LikersModal } from "./LikersModal";
import { CommentSection } from "./CommentSection";
import { ConfirmModal } from "./ConfirmModal";

export function PostCard({ post }: { post: PostDTO }) {
  const queryClient = useQueryClient();
  const updatePost = useUpdatePost();
  const me = useMe();

  const [menuOpen, setMenuOpen] = useState(false);
  const [likersOpen, setLikersOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(post.content);
  const [editVisibility, setEditVisibility] = useState<Visibility>(post.visibility);

  const likeIntent = useRef(0);
  const likeChain = useRef<Promise<unknown>>(Promise.resolve());

  const authorName = `${post.author.firstName} ${post.author.lastName}`;

  const like = useMutation({
    mutationFn: (liked: boolean) => {
      const run = likeChain.current.catch(() => {}).then(() =>
        apiFetch<{ liked: boolean; likeCount: number; likePreview: UserDTO[] }>(
          `/api/posts/${post.id}/like`,
          { method: liked ? "PUT" : "DELETE" },
        ),
      );
      likeChain.current = run;
      return run;
    },
    onMutate: async (liked) => {
      const version = ++likeIntent.current;
      await queryClient.cancelQueries({ queryKey: feedKey });
      const snapshot = {
        likedByMe: post.likedByMe,
        likeCount: post.likeCount,
        likePreview: post.likePreview,
      };
      updatePost(post.id, (p) => {
        const others = p.likePreview.filter((u) => u.id !== me.id);
        return {
          ...p,
          likedByMe: liked,
          likeCount: p.likeCount + (liked === p.likedByMe ? 0 : liked ? 1 : -1),
          likePreview: liked ? [me, ...others].slice(0, 5) : others,
        };
      });
      return { version, snapshot };
    },
    onError: (_err, _liked, ctx) => {
      if (!ctx || ctx.version !== likeIntent.current) return;
      updatePost(post.id, (p) => ({ ...p, ...ctx.snapshot }));
    },
    onSuccess: (res, _liked, ctx) => {
      if (!ctx || ctx.version !== likeIntent.current) return;
      updatePost(post.id, (p) => ({
        ...p,
        likedByMe: res.liked,
        likeCount: res.likeCount,
        likePreview: res.likePreview,
      }));
    },
  });

  const edit = useMutation({
    mutationFn: () =>
      apiFetch<{ post: PostDTO }>(`/api/posts/${post.id}`, {
        method: "PATCH",
        body: JSON.stringify({ content: editValue.trim(), visibility: editVisibility }),
      }),
    onSuccess: ({ post: updated }) => {
      updatePost(post.id, (p) => ({ ...p, content: updated.content, visibility: updated.visibility }));
      setEditing(false);
    },
  });

  function startEdit() {
    setEditValue(post.content);
    setEditVisibility(post.visibility);
    setEditing(true);
    setMenuOpen(false);
  }

  async function remove() {
    await apiFetch(`/api/posts/${post.id}`, { method: "DELETE" });
    await queryClient.invalidateQueries({ queryKey: feedKey });
  }

  const likers = post.likePreview.slice(0, 5);
  const likeOverflow = post.likeCount - likers.length;

  return (
    <div className="_feed_inner_timeline_post_area _b_radious6 _padd_b24 _padd_t24 _mar_b16">
      <div className="_feed_inner_timeline_content _padd_r24 _padd_l24">
        <div className="_feed_inner_timeline_post_top">
          <div className="_feed_inner_timeline_post_box">
            <div className="_feed_inner_timeline_post_box_image">
              <Avatar user={post.author} size={44} className="_post_img" />
            </div>
            <div className="_feed_inner_timeline_post_box_txt">
              <h4 className="_feed_inner_timeline_post_box_title">{authorName}</h4>
              <p className="_feed_inner_timeline_post_box_para">
                {timeAgo(post.createdAt)} . <a href="#0">{post.visibility === "PRIVATE" ? "Private" : "Public"}</a>
              </p>
            </div>
          </div>

          <div className="_feed_inner_timeline_post_box_dropdown">
            <div className="_feed_timeline_post_dropdown">
              <button
                type="button"
                className="_feed_timeline_post_dropdown_link app-link-btn"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Post options"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="4" height="17" fill="none" viewBox="0 0 4 17">
                  <circle cx="2" cy="2" r="2" fill="#C4C4C4" />
                  <circle cx="2" cy="8" r="2" fill="#C4C4C4" />
                  <circle cx="2" cy="15" r="2" fill="#C4C4C4" />
                </svg>
              </button>
            </div>
            <div className={`_feed_timeline_dropdown _timeline_dropdown ${menuOpen ? "show" : ""}`}>
              <ul className="_feed_timeline_dropdown_list">
                <li className="_feed_timeline_dropdown_item">
                  <a href="#0" className="_feed_timeline_dropdown_link">
                    <span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 18 18">
                        <path stroke="#1890FF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M14.25 15.75L9 12l-5.25 3.75v-12a1.5 1.5 0 011.5-1.5h7.5a1.5 1.5 0 011.5 1.5v12z" />
                      </svg>
                    </span>
                    Save Post
                  </a>
                </li>
                <li className="_feed_timeline_dropdown_item">
                  <a href="#0" className="_feed_timeline_dropdown_link">
                    <span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="22" fill="none" viewBox="0 0 20 22">
                        <path fill="#377DFF" fillRule="evenodd" d="M7.547 19.55c.533.59 1.218.915 1.93.915.714 0 1.403-.324 1.938-.916a.777.777 0 011.09-.056c.318.284.344.77.058 1.084-.832.917-1.927 1.423-3.086 1.423h-.002c-1.155-.001-2.248-.506-3.077-1.424a.762.762 0 01.057-1.083.774.774 0 011.092.057zM9.527 0c4.58 0 7.657 3.543 7.657 6.85 0 1.702.436 2.424.899 3.19.457.754.976 1.612.976 3.233-.36 4.14-4.713 4.478-9.531 4.478-4.818 0-9.172-.337-9.528-4.413-.003-1.686.515-2.544.973-3.299l.161-.27c.398-.679.737-1.417.737-2.918C1.871 3.543 4.948 0 9.528 0zm0 1.535c-3.6 0-6.11 2.802-6.11 5.316 0 2.127-.595 3.11-1.12 3.978-.422.697-.755 1.247-.755 2.444.173 1.93 1.455 2.944 7.986 2.944 6.494 0 7.817-1.06 7.988-3.01-.003-1.13-.336-1.681-.757-2.378-.526-.868-1.12-1.851-1.12-3.978 0-2.514-2.51-5.316-6.111-5.316z" clipRule="evenodd" />
                      </svg>
                    </span>
                    Turn On Notification
                  </a>
                </li>
                <li className="_feed_timeline_dropdown_item">
                  <a href="#0" className="_feed_timeline_dropdown_link">
                    <span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 18 18">
                        <path stroke="#1890FF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M14.25 2.25H3.75a1.5 1.5 0 00-1.5 1.5v10.5a1.5 1.5 0 001.5 1.5h10.5a1.5 1.5 0 001.5-1.5V3.75a1.5 1.5 0 00-1.5-1.5zM6.75 6.75l4.5 4.5M11.25 6.75l-4.5 4.5" />
                      </svg>
                    </span>
                    Hide
                  </a>
                </li>
                {post.isMine ? (
                  <>
                    <li className="_feed_timeline_dropdown_item">
                      <a
                        href="#0"
                        className="_feed_timeline_dropdown_link"
                        onClick={(e) => {
                          e.preventDefault();
                          startEdit();
                        }}
                      >
                        <span>
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 18 18">
                            <path stroke="#1890FF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M8.25 3H3a1.5 1.5 0 00-1.5 1.5V15A1.5 1.5 0 003 16.5h10.5A1.5 1.5 0 0015 15V9.75" />
                            <path stroke="#1890FF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M13.875 1.875a1.591 1.591 0 112.25 2.25L9 11.25 6 12l.75-3 7.125-7.125z" />
                          </svg>
                        </span>
                        Edit Post
                      </a>
                    </li>
                    <li className="_feed_timeline_dropdown_item">
                      <a
                        href="#0"
                        className="_feed_timeline_dropdown_link"
                        onClick={(e) => {
                          e.preventDefault();
                          setMenuOpen(false);
                          setConfirmOpen(true);
                        }}
                      >
                        <span>
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 18 18">
                            <path stroke="#1890FF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M2.25 4.5h13.5M6 4.5V3a1.5 1.5 0 011.5-1.5h3A1.5 1.5 0 0112 3v1.5m2.25 0V15a1.5 1.5 0 01-1.5 1.5h-7.5a1.5 1.5 0 01-1.5-1.5V4.5h10.5zM7.5 8.25v4.5M10.5 8.25v4.5" />
                          </svg>
                        </span>
                        Delete Post
                      </a>
                    </li>
                  </>
                ) : null}
              </ul>
            </div>
          </div>
        </div>

        {editing ? (
          <div className="app-editing" style={{ marginBottom: 16 }}>
            <textarea value={editValue} onChange={(e) => setEditValue(e.target.value)} rows={3} />
            <div className="app-inline-actions" style={{ marginTop: 10 }}>
              <select
                className="app-visibility"
                value={editVisibility}
                onChange={(e) => setEditVisibility(e.target.value as Visibility)}
              >
                <option value="PUBLIC">Public</option>
                <option value="PRIVATE">Private</option>
              </select>
              <button
                className="app-link-btn"
                style={{ color: "#377dff" }}
                onClick={() => edit.mutate()}
                disabled={edit.isPending}
              >
                {edit.isPending ? "Saving..." : "Save"}
              </button>
              <button className="app-link-btn" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : post.content ? (
          <h4 className="_feed_inner_timeline_post_title">{post.content}</h4>
        ) : null}

        {post.imageUrl ? (
          <div className="_feed_inner_timeline_image">
            <img src={post.imageUrl} alt="" className="_time_img" />
          </div>
        ) : null}
      </div>

      <div className="_feed_inner_timeline_total_reacts _padd_r24 _padd_l24 _mar_b26">
        {likers.length > 0 ? (
          <div
            className="_feed_inner_timeline_total_reacts_image"
            onClick={() => setLikersOpen(true)}
            role="button"
            style={{ cursor: "pointer" }}
          >
            {likers.map((u, i) => (
              <Avatar
                key={u.id}
                user={u}
                size={32}
                className={i === 0 ? "_react_img1" : `_react_img ${i >= 2 ? "_rect_img_mbl_none" : ""}`}
              />
            ))}
            {likeOverflow > 0 ? (
              <p className="_feed_inner_timeline_total_reacts_para">{likeOverflow}+</p>
            ) : null}
          </div>
        ) : null}
        <div className="_feed_inner_timeline_total_reacts_txt" style={likers.length === 0 ? { marginLeft: "auto" } : undefined}>
          <p className="_feed_inner_timeline_total_reacts_para1">
            <span>{post.commentCount}</span> Comment
          </p>
          <p className="_feed_inner_timeline_total_reacts_para2">
            <span>0</span> Share
          </p>
        </div>
      </div>

      <div className="_feed_inner_timeline_reaction">
        <button
          className={`_feed_inner_timeline_reaction_emoji _feed_reaction ${post.likedByMe ? "_feed_reaction_active" : ""}`}
          onClick={() => like.mutate(!post.likedByMe)}
        >
          <span className="_feed_inner_timeline_reaction_link">
            <span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
              </svg>
              {post.likedByMe ? "Liked" : "Like"}
            </span>
          </span>
        </button>
        <button className="_feed_inner_timeline_reaction_comment _feed_reaction">
          <span className="_feed_inner_timeline_reaction_link">
            <span>
              <svg className="_reaction_svg" xmlns="http://www.w3.org/2000/svg" width="21" height="21" fill="none" viewBox="0 0 21 21">
                <path stroke="#000" d="M1 10.5c0-.464 0-.696.009-.893A9 9 0 019.607 1.01C9.804 1 10.036 1 10.5 1v0c.464 0 .696 0 .893.009a9 9 0 018.598 8.598c.009.197.009.429.009.893v6.046c0 1.36 0 2.041-.317 2.535a2 2 0 01-.602.602c-.494.317-1.174.317-2.535.317H10.5c-.464 0-.696 0-.893-.009a9 9 0 01-8.598-8.598C1 11.196 1 10.964 1 10.5v0z" />
                <path stroke="#000" strokeLinecap="round" strokeLinejoin="round" d="M6.938 9.313h7.125M10.5 14.063h3.563" />
              </svg>
              Comment
            </span>
          </span>
        </button>
        <button className="_feed_inner_timeline_reaction_share _feed_reaction">
          <span className="_feed_inner_timeline_reaction_link">
            <span>
              <svg className="_reaction_svg" xmlns="http://www.w3.org/2000/svg" width="24" height="21" fill="none" viewBox="0 0 24 21">
                <path stroke="#000" strokeLinejoin="round" d="M23 10.5L12.917 1v5.429C3.267 6.429 1 13.258 1 20c2.785-3.52 5.248-5.429 11.917-5.429V20L23 10.5z" />
              </svg>
              Share
            </span>
          </span>
        </button>
      </div>

      <CommentSection
        postId={post.id}
        bumpPostComments={(d) =>
          updatePost(post.id, (p) => ({ ...p, commentCount: Math.max(0, p.commentCount + d) }))
        }
      />

      {likersOpen ? (
        <LikersModal title="Liked by" url={`/api/posts/${post.id}/likers`} onClose={() => setLikersOpen(false)} />
      ) : null}

      {confirmOpen ? (
        <ConfirmModal
          title="Delete post"
          message="This post and its comments will be permanently deleted. This cannot be undone."
          confirmLabel="Delete post"
          onConfirm={remove}
          onCancel={() => setConfirmOpen(false)}
        />
      ) : null}
    </div>
  );
}
