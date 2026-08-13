import type { SessionUser } from "@/lib/client";

export interface NavLink {
  href: string;
  label: string;
  show: (u: SessionUser | null) => boolean;
}

// Public-facing browsing, shown in the top nav. The catalog lives on the
// homepage; the Knowledgebase holds the documentation.
export const PUBLIC_LINKS: NavLink[] = [
  { href: "/", label: "Home", show: () => true },
  { href: "/knowledgebase", label: "Knowledgebase", show: () => true },
];

// The console a user lands on from the top-nav "Dashboard" entry point.
export function primaryConsole(u: SessionUser | null): string {
  if (!u) return "/login";
  if (["reviewer", "superadmin"].includes(u.role)) return "/governance/review";
  if (u.role === "provider") return "/provider";
  return "/settings";
}

const provider = (u: SessionUser | null) => u?.role === "provider";
const gov = (u: SessionUser | null) => u != null && ["reviewer", "superadmin"].includes(u.role);
const superadmin = (u: SessionUser | null) => u?.role === "superadmin";

export interface DashboardItem extends NavLink {
  /** Key into the sidebar icon set (the NXD trust-list rail treatment). */
  icon: string;
}

// Flat dashboard rail, organised like the NXD trust-list backoffice: uppercase
// icon rows, the console's own pages first and the account page last.
export const DASHBOARD_ITEMS: DashboardItem[] = [
  { href: "/provider", label: "Getting Started", icon: "home", show: provider },
  { href: "/provider/submissions", label: "Skill Sources", icon: "upload", show: provider },
  { href: "/governance/review", label: "Review queue", icon: "approvals", show: gov },
  { href: "/governance/organisations", label: "Organisations", icon: "org", show: superadmin },
  { href: "/governance/audit", label: "Audit trail", icon: "activity", show: gov },
  { href: "/governance/users", label: "Users & roles", icon: "users", show: superadmin },
  { href: "/settings", label: "Manage User", icon: "key", show: (u) => u != null },
];
