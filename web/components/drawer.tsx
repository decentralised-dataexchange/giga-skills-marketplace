"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, X } from "@/components/icons";

// Right-hand side panel in the backoffice treatment: a masthead-matched header
// bar (same height and grey as the navbar) with the title and a close cross, a
// grey scrolling body, and an optional white footer bar for actions. The panel
// slides in subtly from the right. Drawers stack at the same width: a nested
// drawer covers its parent and carries a back chevron before the title that
// returns to it, level by level.
export function Drawer({
  title,
  onClose,
  onBack,
  depth = 0,
  width = 680,
  footer,
  children,
}: {
  title: React.ReactNode;
  onClose: () => void;
  /** Present on nested drawers: go back one level to the parent drawer. */
  onBack?: () => void;
  /** 0 for the first panel, 1 for a drawer opened from it, and so on. */
  depth?: number;
  /** Panel width in pixels; wide content (e.g. a review) can ask for more. */
  width?: number;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  // Portal to <body>: inside the dashboard's scroll column, sticky bars and
  // animated ancestors offset fixed overlays and paint over the scrim.
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- standard portal mount gate
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0"
      style={{ zIndex: 50 + depth * 5 }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="drawer-scrim absolute inset-0 bg-[rgba(3,24,43,0.5)]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="drawer-panel absolute inset-y-0 right-0 flex w-full flex-col border-l border-[#e0e0e0] bg-[#f5f5f7] shadow-2xl"
        style={{ maxWidth: `min(${width}px, 100vw)` }}
      >
        <header className="flex min-h-16 flex-none items-center justify-between gap-3 border-b border-[#e0e0e0] bg-[#f5f5f7] px-5 text-ink md:min-h-20">
          <div className="flex min-w-0 items-center gap-2">
            {onBack && (
              <button
                type="button"
                aria-label="Back"
                onClick={onBack}
                className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg border-none bg-transparent text-ink transition-colors hover:bg-black/5"
              >
                <ChevronLeft className="size-6" aria-hidden="true" />
              </button>
            )}
            <h2 className="min-w-0 truncate text-lg font-semibold">{title}</h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg border-none bg-transparent text-ink transition-colors hover:bg-black/5"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">{children}</div>
        {footer && (
          <footer className="flex flex-none items-center justify-between gap-3 border-t border-[#e0e0e0] bg-white px-5 py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
