"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api, auth, useSession } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { Logo } from "@/components/logo";
import { DASHBOARD_NAV } from "@/components/nav-links";
import { cn } from "@/lib/utils";

// Left navigation rail for the dashboard: grouped, admin-only sections.
export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useSession();

  async function signOut() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    auth.signOut();
    router.push("/");
  }

  return (
    <aside className={cn("sticky top-0 h-screen w-60 shrink-0 flex-col border-r border-border bg-white", className)}>
      <Link href="/" className="flex h-16 items-center px-5" aria-label="Giga home">
        <Logo />
      </Link>

      <Link
        href="/"
        className="mx-3 mb-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-ink"
      >
        ← Marketplace
      </Link>

      <nav aria-label="Dashboard" className="flex-1 space-y-4 overflow-y-auto px-3 pb-3">
        {DASHBOARD_NAV.map((group) => {
          const items = group.items.filter((l) => l.show(user));
          if (!items.length) return null;
          return (
            <div key={group.label}>
              <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.label}</p>
              <div className="space-y-0.5">
                {items.map((l) => {
                  const active = pathname === l.href;
                  return (
                    <Link
                      key={l.href}
                      href={l.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "block rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
                        active ? "bg-secondary text-ink" : "text-ink/70 hover:bg-secondary hover:text-ink",
                      )}
                    >
                      {l.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        {user ? (
          <>
            <Link
              href="/settings"
              className={cn(
                "flex items-center gap-2 rounded-lg p-2 transition-colors hover:bg-secondary",
                pathname === "/settings" && "bg-secondary",
              )}
            >
              <UserAvatar name={user.name} avatar={user.avatar} size="sm" decorative />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{user.name}</span>
            </Link>
            <Button variant="secondary" size="sm" className="mt-1.5 w-full" onClick={signOut}>
              Sign out
            </Button>
          </>
        ) : (
          <Button variant="secondary" size="sm" className="w-full" nativeButton={false} render={<Link href="/login" />}>
            Sign in
          </Button>
        )}
      </div>
    </aside>
  );
}
