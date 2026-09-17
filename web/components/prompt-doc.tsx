"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Loader2 } from "@/components/icons";
import { CodeViewer } from "@/components/code-viewer";

// A copyable build prompt loaded from a static markdown file under /public. The
// raw text is shown so a developer can copy the exact prompt and hand it to a
// coding agent. Client-side fetch keeps the prompt a plain static asset.
export function PromptDoc({
  src,
  title,
  subtitle,
}: {
  src: string;
  title: string;
  subtitle?: string;
}) {
  const [text, setText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(src)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((t) => {
        if (alive) setText(t);
      })
      .catch(() => {
        if (alive) setText("");
      });
    return () => {
      alive = false;
    };
  }, [src]);

  function copy() {
    if (!text) return;
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <section className="not-prose my-6 overflow-hidden rounded-lg border border-border">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-secondary/60 px-4 py-3">
        <div className="min-w-0">
          <h3 className="m-0 text-sm font-semibold text-ink">{title}</h3>
          {subtitle ? <p className="m-0 text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        <div className="flex items-center gap-3 text-xs">
          <button
            type="button"
            onClick={copy}
            disabled={!text}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 font-medium text-ink hover:bg-muted disabled:opacity-50"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy prompt"}
          </button>
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-ink"
          >
            Raw
          </a>
        </div>
      </div>
      {text === null ? (
        <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading prompt...
        </div>
      ) : text === "" ? (
        <div className="px-4 py-6 text-sm text-muted-foreground">
          Could not load this prompt. Open the raw file instead.
        </div>
      ) : (
        <CodeViewer content={text} bare maxHeightClass="max-h-[560px]" />
      )}
    </section>
  );
}
