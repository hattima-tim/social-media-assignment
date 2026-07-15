"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client";
import { UserDTO } from "@/lib/types";
import { Avatar } from "./Avatar";

export function LikersModal({ title, url, onClose }: { title: string; url: string; onClose: () => void }) {
  const [users, setUsers] = useState<UserDTO[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<{ users: UserDTO[] }>(url)
      .then((d) => setUsers(d.users))
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load likes"));
  }, [url]);

  return (
    <div className="app-modal-overlay" onClick={onClose}>
      <div className="app-modal" onClick={(e) => e.stopPropagation()}>
        <div className="app-modal-head">
          <h4 className="app-modal-title">{title}</h4>
          <button className="app-link-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {error ? <p className="app-error">{error}</p> : null}
        {!users && !error ? (
          <div className="app-center">
            <span className="app-spinner" />
          </div>
        ) : null}
        {users && users.length === 0 ? <p className="app-center">No likes yet</p> : null}
        {users?.map((u) => (
          <div className="app-liker" key={u.id}>
            <Avatar user={u} size={36} />
            <span>
              {u.firstName} {u.lastName}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
