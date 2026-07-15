"use client";

import { useEffect, useId, useRef, useState } from "react";

type Props = {
  title: string;
  message: string;
  confirmLabel?: string;
  busyLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

export function ConfirmModal({
  title,
  message,
  confirmLabel = "Delete",
  busyLabel = "Deleting...",
  onConfirm,
  onCancel,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const confirmRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      await onConfirm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="app-modal-overlay" onClick={busy ? undefined : onCancel}>
      <div
        className="app-modal app-confirm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        onClick={(e) => e.stopPropagation()}
      >
        <h4 className="app-modal-title" id={titleId}>
          {title}
        </h4>
        <p className="app-confirm-msg" id={messageId}>
          {message}
        </p>
        {error ? <p className="app-error">{error}</p> : null}
        <div className="app-confirm-actions">
          <button type="button" className="app-btn-ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="app-btn-danger" ref={confirmRef} onClick={confirm} disabled={busy}>
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
