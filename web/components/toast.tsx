"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Notice } from "@/components/notice";

interface ToastItem {
  id: number;
  tone: "error" | "success";
  title: string;
  detail?: string;
}

let push: ((item: Omit<ToastItem, "id">) => void) | null = null;
let seq = 0;

// Fire-and-forget notifications, callable from anywhere in client code.
// Errors stay on screen longer than confirmations.
export const toast = {
  error(detail: string, title = "Something went wrong") {
    push?.({ tone: "error", title, detail });
  },
  success(detail: string, title = "Done") {
    push?.({ tone: "success", title, detail });
  },
};

const DURATION_MS = { error: 9000, success: 5000 } as const;

// Mounted once in the root layout; renders the stacked MUI alerts top-right.
export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard portal mount gate
    setMounted(true);
    push = (item) => {
      const id = ++seq;
      setItems((all) => [...all, { ...item, id }]);
      setTimeout(() => setItems((all) => all.filter((t) => t.id !== id)), DURATION_MS[item.tone]);
    };
    return () => {
      push = null;
    };
  }, []);

  if (!mounted) return null;
  return createPortal(
    <div
      role="region"
      aria-label="Notifications"
      className="fixed right-4 top-4 z-[110] flex w-[min(420px,calc(100vw-2rem))] flex-col gap-2"
    >
      {items.map((t) => (
        <div key={t.id} role="alert" className="toast-item">
          <Notice
            severity={t.tone}
            title={t.title}
            onClose={() => setItems((all) => all.filter((x) => x.id !== t.id))}
            className="shadow-lg"
          >
            {t.detail}
          </Notice>
        </div>
      ))}
    </div>,
    document.body,
  );
}
