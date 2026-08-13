'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Right-hand side panel, the marketplace treatment: a scrim, a panel that
 * slides in from the right with a header bar (title + close cross), a
 * scrolling body, and an optional footer bar for actions. Portalled to
 * <body> so sticky bars and animated ancestors never offset it.
 */
export function Drawer({
  title,
  onClose,
  width = 420,
  footer,
  children,
}: {
  title: React.ReactNode;
  onClose: () => void;
  width?: number;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <div className="drawer-root" role="dialog" aria-modal="true">
      <div className="drawer-scrim" onClick={onClose} aria-hidden="true" />
      <div className="drawer-panel" style={{ maxWidth: `min(${width}px, 100vw)` }}>
        <header className="drawer-header">
          <span className="drawer-title">{title}</span>
          <button type="button" aria-label="Close" className="drawer-close" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <div className="drawer-body">{children}</div>
        {footer ? <footer className="drawer-footer">{footer}</footer> : null}
      </div>
    </div>,
    document.body
  );
}
