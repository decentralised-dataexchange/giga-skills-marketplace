import type { SessionUser } from "@/lib/client";
import { FEATURES } from "@/lib/features";

export interface NavLink {
  href: string;
  label: string;
  show: (u: SessionUser | null) => boolean;
}

// Public-facing browsing, shown in the top nav.
export const PUBLIC_LINKS: NavLink[] = [
  { href: "/", label: "Marketplace", show: () => true },
  { href: "/showcase", label: "Showcase", show: () => FEATURES.showcase },
];

// Administrative / console features, shown only in the logged-in dashboard sidebar.
export const CONSOLE_LINKS: NavLink[] = [
  {
    href: "/developer",
    label: "Developer Console",
    show: (u) => u != null && ["builder", "provider"].includes(u.role),
  },
  { href: "/provider", label: "Provider Console", show: (u) => u?.role === "provider" },
  {
    href: "/governance",
    label: "Governance",
    show: (u) => u != null && ["reviewer", "superadmin"].includes(u.role),
  },
  { href: "/settings", label: "Settings", show: (u) => u != null },
];

// The console a user lands on from the top-nav "Dashboard" entry point.
export function primaryConsole(u: SessionUser | null): string {
  if (!u) return "/login";
  if (["reviewer", "superadmin"].includes(u.role)) return "/governance";
  if (u.role === "provider") return "/provider";
  if (u.role === "builder") return "/developer";
  return "/settings";
}

// Grouped dashboard navigation: each console block is its own page.
const gov = (u: SessionUser | null) => u != null && ["reviewer", "superadmin"].includes(u.role);
const superadmin = (u: SessionUser | null) => u?.role === "superadmin";

export interface NavGroup {
  label: string;
  items: NavLink[];
}

export const DASHBOARD_NAV: NavGroup[] = [
  {
    label: "Developer",
    items: [
      {
        href: "/developer",
        label: "Developer Console",
        show: (u) => u != null && ["builder", "provider"].includes(u.role),
      },
      {
        href: "/builder",
        label: "Integration Assistant",
        show: (u) => FEATURES.assistant && u != null && ["builder", "provider"].includes(u.role),
      },
    ],
  },
  {
    label: "Provider",
    items: [
      { href: "/provider", label: "Organisation", show: (u) => u?.role === "provider" },
      { href: "/provider/submit", label: "Publish", show: (u) => u?.role === "provider" },
      {
        href: "/provider/submissions",
        label: "My submissions",
        show: (u) => u?.role === "provider",
      },
    ],
  },
  {
    label: "Governance",
    items: [
      { href: "/governance", label: "Overview", show: gov },
      { href: "/governance/review", label: "Review queue", show: gov },
      { href: "/governance/applications", label: "Applications", show: gov },
      { href: "/governance/organisations", label: "Organisations", show: superadmin },
      { href: "/governance/users", label: "Users & roles", show: superadmin },
      { href: "/governance/published", label: "Published", show: superadmin },
      { href: "/governance/audit", label: "Audit trail", show: gov },
    ],
  },
  {
    label: "Account",
    items: [{ href: "/settings", label: "Settings", show: (u) => u != null }],
  },
];
