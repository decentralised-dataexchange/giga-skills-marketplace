import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STYLES: Record<string, { label: string; className: string }> = {
  published: { label: "Published", className: "bg-emerald-500/15 text-emerald-400" },
  approved: { label: "Approved", className: "bg-emerald-500/15 text-emerald-400" },
  active: { label: "Active", className: "bg-emerald-500/15 text-emerald-400" },
  submitted: { label: "Submitted", className: "bg-muted text-muted-foreground" },
  in_review: { label: "In review", className: "bg-amber-500/15 text-amber-400" },
  pending: { label: "Pending review", className: "bg-amber-500/15 text-amber-400" },
  changes_requested: { label: "Changes requested", className: "bg-amber-500/15 text-amber-400" },
  checks_failed: { label: "Checks failed", className: "bg-red-500/15 text-red-400" },
  rejected: { label: "Rejected", className: "bg-red-500/15 text-red-400" },
  suspended: { label: "Suspended", className: "bg-red-500/15 text-red-400" },
  superseded: { label: "Superseded", className: "bg-muted text-muted-foreground" },
  delisted: { label: "Delisted", className: "bg-muted text-muted-foreground" },
  in_submission: { label: "In submission", className: "bg-muted text-muted-foreground" },
};

export function StatusBadge({ status }: { status: string }) {
  const style = STYLES[status] ?? { label: status, className: "bg-muted text-muted-foreground" };
  return <Badge className={cn("border-0", style.className)}>{style.label}</Badge>;
}
