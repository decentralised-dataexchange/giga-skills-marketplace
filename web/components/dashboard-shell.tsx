"use client";

import { useEffect } from "react";
import { auth, useSession, type SessionUser } from "@/lib/client";

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

// Consistent full-width page container for dashboard pages.
export function DashboardMain({
  title,
  subtitle,
  children,
  denied,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  denied?: boolean;
}) {
  return (
    <main className="w-full space-y-5 px-6 py-8 lg:px-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {denied ? (
        <p className="text-sm font-semibold text-amber-600">You do not have access to this page.</p>
      ) : (
        children
      )}
    </main>
  );
}
