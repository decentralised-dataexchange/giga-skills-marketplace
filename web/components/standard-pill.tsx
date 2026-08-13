import { cn } from "@/lib/utils";

// Renders a provider-declared protocol/standard code from a skill bundle as a
// pill (outlined rounded-full, as the topic pills on a skills.sh skill page).
// The value comes straight from the bundle manifest, so it is shown verbatim
// with no interpretation or tooltip.
export function StandardPill({ code, className }: { code: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-brand/20 bg-accent px-2.5 py-1 text-xs font-medium text-brand-dark",
        className,
      )}
    >
      {code}
    </span>
  );
}
