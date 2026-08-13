"use client";

import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bold, Code, Heading, Italic, Link2, List, type LucideIcon } from "@/components/icons";
import { Tip } from "@/components/tip";
import { cn } from "@/lib/utils";

function ToolBtn({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <Tip content={label}>
      <button
        type="button"
        aria-label={label}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClick}
        className="grid size-7 place-items-center rounded text-muted-foreground hover:bg-secondary hover:text-ink"
      >
        <Icon className="size-3.5" />
      </button>
    </Tip>
  );
}

// Textarea with a Write / Preview toggle and a minimal markdown toolbar.
export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  minHeightClass = "min-h-28",
  id,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minHeightClass?: string;
  id?: string;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState<"write" | "preview">("write");

  function surround(before: string, after = before) {
    const ta = ref.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    const sel = value.slice(s, e);
    const next = value.slice(0, s) + before + sel + after + value.slice(e);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = s + before.length;
      ta.selectionEnd = e + before.length + sel.length;
    });
  }

  function prefixLine(prefix: string) {
    const ta = ref.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const lineStart = value.lastIndexOf("\n", s - 1) + 1;
    const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = s + prefix.length;
    });
  }

  return (
    <div className="overflow-hidden rounded-lg border border-input bg-white">
      <div className="flex items-center justify-between border-b border-border bg-muted/50 px-2 py-1">
        <div className="flex gap-0.5">
          {(["write", "preview"] as const).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tab === t}
              onClick={() => setTab(t)}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-semibold capitalize transition-colors",
                tab === t ? "bg-white text-ink shadow-sm" : "text-muted-foreground hover:text-ink",
              )}
            >
              {t}
            </button>
          ))}
        </div>
        {tab === "write" && (
          <div className="flex gap-0.5">
            <ToolBtn icon={Bold} label="Bold" onClick={() => surround("**")} />
            <ToolBtn icon={Italic} label="Italic" onClick={() => surround("_")} />
            <ToolBtn icon={Heading} label="Heading" onClick={() => prefixLine("## ")} />
            <ToolBtn icon={List} label="List" onClick={() => prefixLine("- ")} />
            <ToolBtn icon={Code} label="Code" onClick={() => surround("`")} />
            <ToolBtn icon={Link2} label="Link" onClick={() => surround("[", "](url)")} />
          </div>
        )}
      </div>

      {tab === "write" ? (
        <textarea
          ref={ref}
          id={id}
          aria-label={ariaLabel}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full resize-y bg-transparent px-3 py-2 font-mono text-base outline-none placeholder:text-muted-foreground md:text-sm",
            minHeightClass,
          )}
        />
      ) : (
        <div className={cn("markdown overflow-auto px-3 py-2 text-sm", minHeightClass)}>
          {value.trim() ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
          ) : (
            <p className="text-muted-foreground">Nothing to preview.</p>
          )}
        </div>
      )}
    </div>
  );
}
