import { cn } from "@/lib/utils";

// Read-only text viewer with a line-number gutter. The gutter is aria-hidden and
// non-selectable so copying grabs only the source, not the numbers.
export function CodeViewer({
  content,
  className,
  maxHeightClass = "max-h-[520px]",
  bare = false,
}: {
  content: string;
  className?: string;
  maxHeightClass?: string;
  bare?: boolean;
}) {
  const lines = (content ?? "").replace(/\n$/, "").split("\n");
  const gutter = lines.map((_, i) => i + 1).join("\n");

  return (
    <div
      className={cn(
        "overflow-auto bg-muted font-mono text-xs leading-relaxed",
        bare ? "" : "rounded-lg border border-border",
        maxHeightClass,
        className,
      )}
    >
      <div className="flex min-w-full">
        <pre
          aria-hidden="true"
          className="shrink-0 select-none border-r border-border bg-secondary/60 px-3 py-4 text-right text-muted-foreground"
        >
          {gutter}
        </pre>
        <pre className="min-w-0 flex-1 px-4 py-4 text-ink/80">{content}</pre>
      </div>
    </div>
  );
}
