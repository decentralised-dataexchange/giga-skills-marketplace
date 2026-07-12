"use client";

import { BadgeCheck, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tip } from "@/components/tip";

// Official = endorsed by the marketplace operator (first-party / sanctioned).
// Community = published by a verified provider but not operator-endorsed.
export function OfficialBadge({ official, className }: { official: boolean; className?: string }) {
  const base = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold";
  if (official) {
    return (
      <Tip content="Official: endorsed by the marketplace operator as a sanctioned, first-party skill.">
        <span className={cn(base, "bg-accent text-brand-dark", className)}>
          <BadgeCheck className="size-3.5" aria-hidden="true" />
          Official
        </span>
      </Tip>
    );
  }
  return (
    <Tip content="Community: published by a verified provider, not operator-endorsed.">
      <span className={cn(base, "bg-secondary text-muted-foreground", className)}>
        <Users className="size-3.5" aria-hidden="true" />
        Community
      </span>
    </Tip>
  );
}
