"use client";

import Link from "next/link";
import {
  Activity,
  BadgeCheck,
  Building2,
  Home,
  KeyRound,
  ScrollText,
  Shield,
  Upload,
  Users,
} from "@/components/icons";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/client";
import { DASHBOARD_ITEMS } from "@/components/nav-links";
import { cn } from "@/lib/utils";

// The NXD trust-list rail icon set: 20px lucide glyphs in the muted ink tone.
const ICONS: Record<string, React.ReactNode> = {
  home: <Home className="size-5 shrink-0 text-[#48484d]" aria-hidden="true" />,
  upload: <Upload className="size-5 shrink-0 text-[#48484d]" aria-hidden="true" />,
  scroll: <ScrollText className="size-5 shrink-0 text-[#48484d]" aria-hidden="true" />,
  approvals: <BadgeCheck className="size-5 shrink-0 text-[#48484d]" aria-hidden="true" />,
  org: <Building2 className="size-5 shrink-0 text-[#48484d]" aria-hidden="true" />,
  shield: <Shield className="size-5 shrink-0 text-[#48484d]" aria-hidden="true" />,
  activity: <Activity className="size-5 shrink-0 text-[#48484d]" aria-hidden="true" />,
  users: <Users className="size-5 shrink-0 text-[#48484d]" aria-hidden="true" />,
  key: <KeyRound className="size-5 shrink-0 text-[#48484d]" aria-hidden="true" />,
};

// Left navigation rail for the dashboard, organised as in the NXD trust-list
// backoffice: a light #fafafa rail of flat uppercase icon rows with plain
// black-on-grey hover/active states. The user block lives in the navy topbar.
export function Sidebar({
  className,
  collapsed = false,
}: {
  className?: string;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const user = useSession();

  return (
    <aside
      className={cn(
        "h-full w-[280px] shrink-0 flex-col overflow-x-hidden overflow-y-auto whitespace-nowrap border-r border-[#e0e0e0] bg-[#fafafa] pt-2 pb-10 transition-[width] duration-200",
        collapsed && "md:w-0 md:border-r-0",
        className,
      )}
    >
      <nav aria-label="Dashboard" className="flex-1">
        {DASHBOARD_ITEMS.filter((l) => l.show(user)).map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "my-1.5 flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.66px] text-[#58585d] no-underline transition-colors hover:bg-black/5 hover:text-black",
                active && "bg-black/5 text-black",
              )}
            >
              {ICONS[l.icon]}
              {l.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
