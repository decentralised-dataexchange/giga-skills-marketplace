import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

// Renders markdown text (descriptions, notes) with the shared .markdown styles.
export function Markdown({ children, className }: { children: string; className?: string }) {
  if (!children?.trim()) return null;
  return (
    <div className={cn("markdown", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
