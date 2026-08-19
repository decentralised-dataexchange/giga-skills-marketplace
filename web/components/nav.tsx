"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Github, Menu, X } from "@/components/icons";
import { api, auth, useSession } from "@/lib/client";
import { Logo } from "@/components/logo";
import { AccountMenu } from "@/components/account-menu";
import { PUBLIC_LINKS, REPO_URL, primaryConsole } from "@/components/nav-links";
import { cn } from "@/lib/utils";

// Public masthead in the same subtle-grey treatment as the dashboard topbar;
// the only difference is that there is no sidebar collapse hamburger. The
// small-screen trigger on the right only opens the public menu.
export function Nav({ className }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useSession();
  const [open, setOpen] = useState(false);

  async function signOut() {
    setOpen(false);
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    auth.signOut();
    router.push("/");
  }

  const links = PUBLIC_LINKS.filter((l) => l.show(user));

  return (
    <header
      className={cn(
        "sticky top-0 z-20 border-b border-[#e0e0e0] bg-[#f5f5f7] text-ink shadow-sm",
        className,
      )}
    >
      <div className="flex min-h-16 items-center gap-3 px-4 md:min-h-20 md:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="Giga home">
          <Logo className="h-11 md:h-12" />
          <span className="hidden font-heading text-[clamp(1rem,2vw,1.4rem)] font-semibold tracking-tight sm:inline">
            Skills <span className="text-muted-foreground">Marketplace</span>
          </span>
        </Link>

        {/* Desktop nav, beside the wordmark */}
        <nav aria-label="Primary" className="ml-4 hidden gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={pathname === l.href ? "page" : undefined}
              className={cn(
                "rounded-md px-3.5 py-1.5 text-sm font-medium text-ink/70 transition-colors hover:text-ink",
                pathname === l.href && "text-brand",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex-1" />

        <div className="hidden items-center gap-1 md:flex">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium text-ink/70 transition-colors hover:text-ink"
          >
            <Github className="size-4.5" />
            GitHub
          </a>
          {user ? (
            <AccountMenu user={user} />
          ) : (
            // A plain nav item, not a call-to-action button: the login page
            // forwards to the dashboard once signed in.
            <Link
              href="/login"
              className="rounded-md px-3.5 py-1.5 text-sm font-medium text-ink/70 transition-colors hover:text-ink"
            >
              Dashboard
            </Link>
          )}
        </div>

        {/* Mobile trigger */}
        <div className="flex justify-end md:hidden">
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="grid size-9 place-items-center rounded-lg text-ink hover:bg-black/5"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <nav
          aria-label="Primary"
          className="space-y-1 border-t border-[#e0e0e0] bg-white px-4 py-3 md:hidden"
        >
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              aria-current={pathname === l.href ? "page" : undefined}
              className={cn(
                "block rounded-lg px-3 py-2 text-sm font-medium",
                pathname === l.href ? "text-brand" : "text-ink/70 hover:bg-accent hover:text-ink",
              )}
            >
              {l.label}
            </Link>
          ))}
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-ink/70 hover:bg-accent hover:text-ink"
          >
            <Github className="size-4.5" />
            GitHub
          </a>
          <div className="border-t border-border pt-2">
            {user ? (
              <>
                <Link
                  href={primaryConsole(user)}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-ink/70 hover:bg-accent hover:text-ink"
                >
                  Dashboard
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-ink/70 hover:bg-accent hover:text-ink"
                >
                  Manage User
                </Link>
                <button
                  type="button"
                  onClick={signOut}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-ink/70 hover:bg-accent hover:text-ink"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-ink/70 hover:bg-accent hover:text-ink"
              >
                Dashboard
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
