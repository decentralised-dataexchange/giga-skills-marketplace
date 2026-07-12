import { cn } from "@/lib/utils";

// Renders a provider-declared protocol/standard code from a skill bundle as a
// pill. The value comes straight from the bundle manifest, so it is shown
// verbatim with no interpretation or tooltip.
export function StandardPill({ code, className }: { code: string; className?: string }) {
  return (
    <span
      className={cn(
        "rounded-full bg-accent px-3 py-1 text-xs font-semibold text-brand-dark",
        className,
      )}
    >
      {code}
    </span>
  );
}
