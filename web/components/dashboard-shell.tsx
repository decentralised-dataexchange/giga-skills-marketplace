"use client";

import { useEffect } from "react";
import { auth, useSession, type SessionUser } from "@/lib/client";
import { Notice } from "@/components/notice";

type Role = SessionUser["role"];

// Redirects to the dashboard sign-in when signed out; flags denied when the
// signed-in user lacks the required role.
export function useDashboardGuard(pathname: string, allowed?: Role[]) {
  const user = useSession();
  useEffect(() => {
    if (typeof window !== "undefined" && !auth.user) {
      location.href = `/login?next=${encodeURIComponent(pathname)}`;
    }
  }, [pathname]);
  const denied = user != null && allowed != null && !allowed.includes(user.role);
  return { user, denied };
}

// Consistent full-width page container for dashboard pages. `actions` renders
// beside the title (e.g. the round + button on Skill Sources).
export function DashboardMain({
  title,
  subtitle,
  actions,
  children,
  denied,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  denied?: boolean;
}) {
  return (
    <main className="w-full space-y-4 px-4 pt-6 pb-12 md:px-8">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="m-0 text-[20px] font-bold text-black">{title}</h1>
          {actions}
        </div>
        {subtitle && <p className="mt-1 text-sm text-black/85">{subtitle}</p>}
      </div>
      {denied ? <Notice severity="warning">You do not have access to this page.</Notice> : children}
    </main>
  );
}
