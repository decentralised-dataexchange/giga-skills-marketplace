import { cn } from "@/lib/utils";

export interface Check {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
}

const ICON = { pass: "✓", warn: "!", fail: "✕" } as const;
const COLOR = { pass: "text-emerald-600", warn: "text-amber-600", fail: "text-red-600" } as const;

export function CheckList({ checks }: { checks: Check[] }) {
  return (
    <div className="divide-y divide-border">
      {checks.map((c) => (
        <div key={c.id} className="flex gap-3 py-2 text-sm">
          <span className={cn("w-4 shrink-0 text-center font-bold", COLOR[c.status])}>
            {ICON[c.status]}
          </span>
          <span>
            {c.label}
            {c.detail && <span className="block text-xs text-muted-foreground">{c.detail}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}
