"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Menu, X } from "lucide-react";
import { api, auth, useSession } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { Logo } from "@/components/logo";
import { DASHBOARD_NAV } from "@/components/nav-links";
import { cn } from "@/lib/utils";

// Mobile navigation for the dashboard: a top bar with a collapsible menu,
// since the sidebar rail is desktop-only.
export function DashboardTopbar({ className }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useSession();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    auth.signOut();
    router.push("/");
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-20 border-b border-border bg-white/90 backdrop-blur-md",
        className,
      )}
    >
      <div className="flex h-14 items-center justify-between px-5">
        <Link href="/" className="flex items-center" aria-label="Giga home">
          <Logo />
        </Link>
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="grid size-9 place-items-center rounded-lg text-ink hover:bg-secondary"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <nav
          aria-label="Dashboard"
          className="max-h-[70vh] space-y-4 overflow-y-auto border-t border-border px-4 py-3"
        >
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-ink"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Marketplace
          </Link>
          {DASHBOARD_NAV.map((group) => {
            const items = group.items.filter((l) => l.show(user));
            if (!items.length) return null;
            return (
              <div key={group.label}>
                <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {items.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      onClick={() => setOpen(false)}
                      aria-current={pathname === l.href ? "page" : undefined}
                      className={cn(
                        "block rounded-lg px-3 py-1.5 text-sm font-semibold",
                        pathname === l.href
                          ? "bg-secondary text-ink"
                          : "text-ink/70 hover:bg-secondary hover:text-ink",
                      )}
                    >
                      {l.label}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
          {user && (
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="flex items-center gap-2 text-sm font-medium text-ink">
                <UserAvatar name={user.name} avatar={user.avatar} size="sm" decorative />
                {user.name}
              </span>
              <Button variant="secondary" size="sm" onClick={signOut}>
                Sign out
              </Button>
            </div>
          )}
        </nav>
      )}
    </header>
  );
}
