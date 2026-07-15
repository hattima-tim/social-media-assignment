"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { apiFetch } from "@/lib/client";
import { CommentDTO } from "@/lib/types";
import { timeAgo } from "@/lib/time";
import { useReplies } from "@/hooks/useComments";
import { useMe } from "./me-context";
import { Avatar } from "./Avatar";
import { LikersModal } from "./LikersModal";
import { ConfirmModal } from "./ConfirmModal";

type Props = {
  comment: CommentDTO;
  postId: string;
  isReply?: boolean;
  bumpPostComments: (delta: number) => void;
  onDeleted: (removed: number) => void;
};

export function CommentItem({ comment, postId, isReply = false, bumpPostComments, onDeleted }: Props) {
  const me = useMe();
  const queryClient = useQueryClient();

  const [content, setContent] = useState(comment.content);
  const [liked, setLiked] = useState(comment.likedByMe);
  const [likeCount, setLikeCount] = useState(comment.likeCount);
  const [replyCount, setReplyCount] = useState(comment.replyCount);

  const likeIntent = useRef(0);
  const likeChain = useRef<Promise<unknown>>(Promise.resolve());

  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(comment.content);
  const [showReplies, setShowReplies] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyValue, setReplyValue] = useState("");
  const [replyBusy, setReplyBusy] = useState(false);
  const [likersOpen, setLikersOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const replies = useReplies(comment.id, showReplies);
  const replyItems = replies.data?.pages.flatMap((p) => p.items) ?? [];

  async function toggleLike() {
    const next = !liked;
    const version = ++likeIntent.current;
    const snapshot = { liked, likeCount };
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));

    const run = likeChain.current.catch(() => {}).then(() =>
      apiFetch<{ liked: boolean; likeCount: number }>(`/api/comments/${comment.id}/like`, {
        method: next ? "PUT" : "DELETE",
      }),
    );
    likeChain.current = run;

    try {
      const res = await run;
      if (version !== likeIntent.current) return;
      setLiked(res.liked);
      setLikeCount(res.likeCount);
    } catch {
      if (version !== likeIntent.current) return;
      setLiked(snapshot.liked);
      setLikeCount(snapshot.likeCount);
    }
  }

  async function saveEdit() {
    const value = editValue.trim();
    if (!value) return;
    const { comment: updated } = await apiFetch<{ comment: CommentDTO }>(`/api/comments/${comment.id}`, {
      method: "PATCH",
      body: JSON.stringify({ content: value }),
    });
    setContent(updated.content);
    setEditing(false);
  }

  async function remove() {
    await apiFetch(`/api/comments/${comment.id}`, { method: "DELETE" });
    onDeleted(isReply ? 1 : 1 + replyCount);
  }

  async function submitReply(e?: React.FormEvent) {
    e?.preventDefault();
    const value = replyValue.trim();
    if (!value || replyBusy) return;
    setReplyBusy(true);
    try {
      await apiFetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content: value, parentId: comment.id }),
      });
      setReplyValue("");
      setReplyOpen(false);
      setReplyCount((c) => c + 1);
      bumpPostComments(1);
      setShowReplies(true);
      await queryClient.invalidateQueries({ queryKey: ["replies", comment.id] });
    } finally {
      setReplyBusy(false);
    }
  }

  return (
    <div className={`_comment_main ${isReply ? "app-reply" : ""}`}>
      <div className="_comment_image">
        <Avatar user={comment.author} size={36} className="_comment_img1" />
      </div>
      <div className="_comment_area" style={{ flex: 1 }}>
        <div className="_comment_details">
          <div className="_comment_details_top">
            <div className="_comment_name">
              <h4 className="_comment_name_title">
                {comment.author.firstName} {comment.author.lastName}
              </h4>
            </div>
          </div>

          {editing ? (
            <div className="app-editing">
              <textarea value={editValue} onChange={(e) => setEditValue(e.target.value)} rows={2} />
              <div className="app-inline-actions" style={{ marginTop: 8 }}>
                <button className="app-link-btn" style={{ color: "#377dff" }} onClick={saveEdit}>
                  Save
                </button>
                <button
                  className="app-link-btn"
                  onClick={() => {
                    setEditing(false);
                    setEditValue(content);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="_comment_status">
              <p className="_comment_status_text">
                <span>{content}</span>
              </p>
            </div>
          )}

          {likeCount > 0 ? (
            <button
              type="button"
              className="_total_reactions"
              onClick={() => setLikersOpen(true)}
              aria-label={`See who liked this ${isReply ? "reply" : "comment"}`}
            >
              <span className="_total_react">
                <span className="_reaction_like">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                  </svg>
                </span>
              </span>
              <span className="_total">{likeCount}</span>
            </button>
          ) : null}

          <div className="_comment_reply">
            <div className="_comment_reply_num">
              <ul className="_comment_reply_list">
                <li>
                  <button className="app-link-btn" onClick={toggleLike} style={liked ? { color: "#377dff" } : undefined}>
                    <span>{liked ? "Liked." : "Like."}</span>
                  </button>
                </li>
                {!isReply ? (
                  <li>
                    <button className="app-link-btn" onClick={() => setReplyOpen((v) => !v)}>
                      <span>Reply.</span>
                    </button>
                  </li>
                ) : null}
                {comment.isMine ? (
                  <li>
                    <button className="app-link-btn" onClick={() => setEditing(true)}>
                      <span>Edit.</span>
                    </button>
                  </li>
                ) : null}
                {comment.isMine ? (
                  <li>
                    <button className="app-link-btn" onClick={() => setConfirmOpen(true)}>
                      <span>Delete.</span>
                    </button>
                  </li>
                ) : null}
                <li>
                  <span className="_time_link">{timeAgo(comment.createdAt)}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {!isReply && replyCount > 0 ? (
          <div className="_previous_comment">
            <button type="button" className="_previous_comment_txt" onClick={() => setShowReplies((v) => !v)}>
              {showReplies ? "Hide replies" : `View ${replyCount} ${replyCount === 1 ? "reply" : "replies"}`}
            </button>
          </div>
        ) : null}

        {!isReply && showReplies
          ? replyItems.map((r) => (
              <CommentItem
                key={r.id}
                comment={r}
                postId={postId}
                isReply
                bumpPostComments={bumpPostComments}
                onDeleted={(removed) => {
                  setReplyCount((c) => Math.max(0, c - 1));
                  bumpPostComments(-removed);
                  queryClient.invalidateQueries({ queryKey: ["replies", comment.id] });
                }}
              />
            ))
          : null}

        {!isReply && showReplies && replies.hasNextPage ? (
          <div className="_previous_comment">
            <button type="button" className="_previous_comment_txt" onClick={() => replies.fetchNextPage()}>
              View more replies
            </button>
          </div>
        ) : null}

        {!isReply && replyOpen ? (
          <div className="_feed_inner_comment_box">
            <form className="_feed_inner_comment_box_form" onSubmit={submitReply}>
              <div className="_feed_inner_comment_box_content">
                <div className="_feed_inner_comment_box_content_image">
                  <Avatar user={me} size={32} className="_comment_img" />
                </div>
                <div className="_feed_inner_comment_box_content_txt">
                  <textarea
                    className="form-control _comment_textarea"
                    placeholder="Write a reply"
                    value={replyValue}
                    onChange={(e) => setReplyValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        submitReply();
                      }
                    }}
                  />
                </div>
              </div>
              <div className="_feed_inner_comment_box_icon">
                <button type="button" className="_feed_inner_comment_box_icon_btn" aria-label="Voice reply">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 16 16">
                    <path fill="#000" fillOpacity=".46" fillRule="evenodd" d="M13.167 6.534a.5.5 0 01.5.5c0 3.061-2.35 5.582-5.333 5.837V14.5a.5.5 0 01-1 0v-1.629C4.35 12.616 2 10.096 2 7.034a.5.5 0 011 0c0 2.679 2.168 4.859 4.833 4.859 2.666 0 4.834-2.18 4.834-4.86a.5.5 0 01.5-.5zM7.833.667a3.218 3.218 0 013.208 3.22v3.126c0 1.775-1.439 3.22-3.208 3.22a3.218 3.218 0 01-3.208-3.22V3.887c0-1.776 1.44-3.22 3.208-3.22zm0 1a2.217 2.217 0 00-2.208 2.22v3.126c0 1.223.991 2.22 2.208 2.22a2.217 2.217 0 002.208-2.22V3.887c0-1.224-.99-2.22-2.208-2.22z" clipRule="evenodd" />
                  </svg>
                </button>
                <button type="submit" className="_feed_inner_comment_box_icon_btn" aria-label="Send reply" disabled={replyBusy}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 16 16">
                    <path fill="#000" fillOpacity=".46" fillRule="evenodd" d="M10.867 1.333c2.257 0 3.774 1.581 3.774 3.933v5.435c0 2.352-1.517 3.932-3.774 3.932H5.101c-2.254 0-3.767-1.58-3.767-3.932V5.266c0-2.352 1.513-3.933 3.767-3.933h5.766zm0 1H5.101c-1.681 0-2.767 1.152-2.767 2.933v5.435c0 1.782 1.086 2.932 2.767 2.932h5.766c1.685 0 2.774-1.15 2.774-2.932V5.266c0-1.781-1.089-2.933-2.774-2.933zm.426 5.733l.017.015.013.013.009.008.037.037c.12.12.453.46 1.443 1.477a.5.5 0 11-.716.697S10.73 8.91 10.633 8.816a.614.614 0 00-.433-.118.622.622 0 00-.421.225c-1.55 1.88-1.568 1.897-1.594 1.922a1.456 1.456 0 01-2.057-.021s-.62-.63-.63-.642c-.155-.143-.43-.134-.594.04l-1.02 1.076a.498.498 0 01-.707.018.499.499 0 01-.018-.706l1.018-1.075c.54-.573 1.45-.6 2.025-.06l.639.647c.178.18.467.184.646.008l1.519-1.843a1.618 1.618 0 011.098-.584c.433-.038.854.088 1.19.363zM5.706 4.42c.921 0 1.67.75 1.67 1.67 0 .92-.75 1.67-1.67 1.67-.92 0-1.67-.75-1.67-1.67 0-.921.75-1.67 1.67-1.67zm0 1a.67.67 0 10.001 1.34.67.67 0 00-.002-1.34z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </div>

      {likersOpen ? (
        <LikersModal
          title="Liked by"
          url={`/api/comments/${comment.id}/likers`}
          onClose={() => setLikersOpen(false)}
        />
      ) : null}

      {confirmOpen ? (
        <ConfirmModal
          title={isReply ? "Delete reply" : "Delete comment"}
          message={
            !isReply && replyCount > 0
              ? `This comment and its ${replyCount} ${replyCount === 1 ? "reply" : "replies"} will be permanently deleted. This cannot be undone.`
              : "This will be permanently deleted. This cannot be undone."
          }
          confirmLabel={isReply ? "Delete reply" : "Delete comment"}
          onConfirm={remove}
          onCancel={() => setConfirmOpen(false)}
        />
      ) : null}
    </div>
  );
}
