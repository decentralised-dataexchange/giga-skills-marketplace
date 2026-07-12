"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

function pageWindow(page: number, pages: number): (number | "…")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pages - 1, page + 1);
  if (start > 2) out.push("…");
  for (let n = start; n <= end; n++) out.push(n);
  if (end < pages - 1) out.push("…");
  out.push(pages);
  return out;
}

// Reusable pagination control. Works for server-paged data (onPage refetches)
// and client-paged arrays (onPage sets state that slices the array).
export function Pagination({
  page,
  pageSize,
  total,
  onPage,
  className,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  className?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;

  const btn =
    "grid h-8 min-w-8 place-items-center rounded-md border border-border px-2 text-sm font-medium transition-colors";
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex flex-wrap items-center justify-between gap-3 pt-2", className)}
    >
      <p className="text-xs text-muted-foreground tabular-nums">
        {from}-{to} of {total}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className={cn(
            btn,
            "text-ink hover:bg-secondary disabled:pointer-events-none disabled:opacity-40",
          )}
        >
          <ChevronLeft className="size-4" />
        </button>
        {pageWindow(page, pages).map((n, i) =>
          n === "…" ? (
            <span
              key={`gap-${i}`}
              className="px-1 text-sm text-muted-foreground"
              aria-hidden="true"
            >
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              onClick={() => onPage(n)}
              aria-current={n === page ? "page" : undefined}
              className={cn(
                btn,
                n === page
                  ? "border-brand bg-brand text-primary-foreground"
                  : "text-ink hover:bg-secondary",
              )}
            >
              {n}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
          aria-label="Next page"
          className={cn(
            btn,
            "text-ink hover:bg-secondary disabled:pointer-events-none disabled:opacity-40",
          )}
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </nav>
  );
}

// Slice an array for client-side pagination.
export function pageSlice<T>(items: T[], page: number, pageSize: number): T[] {
  return items.slice((page - 1) * pageSize, page * pageSize);
}
