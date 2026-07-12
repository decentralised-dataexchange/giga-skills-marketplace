import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const OK = "bg-emerald-100 text-emerald-700";
const WARN = "bg-amber-100 text-amber-700";
const BAD = "bg-red-100 text-red-700";
const NEUTRAL = "bg-secondary text-ink/60";

const STYLES: Record<string, { label: string; className: string }> = {
  published: { label: "Published", className: OK },
  approved: { label: "Approved", className: OK },
  active: { label: "Active", className: OK },
  submitted: { label: "Submitted", className: NEUTRAL },
  in_review: { label: "In review", className: WARN },
  pending: { label: "Pending review", className: WARN },
  changes_requested: { label: "Changes requested", className: WARN },
  checks_failed: { label: "Checks failed", className: BAD },
  rejected: { label: "Rejected", className: BAD },
  suspended: { label: "Suspended", className: BAD },
  superseded: { label: "Superseded", className: NEUTRAL },
  delisted: { label: "Delisted", className: NEUTRAL },
  in_submission: { label: "In submission", className: NEUTRAL },
};

export function StatusBadge({ status }: { status: string }) {
  const style = STYLES[status] ?? { label: status, className: "bg-muted text-muted-foreground" };
  return <Badge className={cn("border-0", style.className)}>{style.label}</Badge>;
}
