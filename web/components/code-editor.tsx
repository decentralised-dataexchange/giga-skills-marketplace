"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

// Editable code textarea with a synced line-number gutter.
export function CodeEditor({
  value,
  onChange,
  placeholder,
  className,
  minHeightClass = "min-h-40",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  minHeightClass?: string;
}) {
  const gutterRef = useRef<HTMLPreElement>(null);
  const lines = value.split("\n").length;
  const gutter = Array.from({ length: lines }, (_, i) => i + 1).join("\n");

  return (
    <div
      className={cn(
        "flex overflow-hidden rounded-lg border border-input bg-muted font-mono text-xs leading-relaxed",
        className,
      )}
    >
      <pre
        ref={gutterRef}
        aria-hidden="true"
        className="shrink-0 select-none overflow-hidden border-r border-border bg-secondary/60 px-2 py-2 text-right text-muted-foreground"
      >
        {gutter}
      </pre>
      <textarea
        value={value}
        placeholder={placeholder}
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        onScroll={(e) => {
          if (gutterRef.current) gutterRef.current.scrollTop = e.currentTarget.scrollTop;
        }}
        className={cn(
          "w-full resize-y whitespace-pre bg-transparent px-3 py-2 leading-relaxed text-ink/90 outline-none placeholder:text-muted-foreground",
          minHeightClass,
        )}
      />
    </div>
  );
}
