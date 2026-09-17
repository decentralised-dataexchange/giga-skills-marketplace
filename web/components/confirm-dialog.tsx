"use client";

import { type ReactNode, useEffect } from "react";
import { Button } from "@/components/ui/button";

// A small, self-contained confirmation modal for irreversible actions. It owns
// no data: the caller controls `open` and supplies the copy and the handlers.
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/20"
        onClick={() => !busy && onCancel()}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-md rounded-xl bg-white p-5 shadow-xl ring-1 ring-black/10"
      >
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        <div className="mt-2 text-sm text-muted-foreground">{description}</div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={busy}>
            {busy ? "Deleting…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
