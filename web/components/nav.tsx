"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { api, auth, useSession } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { Logo } from "@/components/logo";
import { PUBLIC_LINKS, primaryConsole } from "@/components/nav-links";
import { cn } from "@/lib/utils";

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
        "sticky top-0 z-20 border-b border-border bg-white/90 backdrop-blur-md",
        className,
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1536px] items-center gap-1 px-5 sm:px-6 lg:px-8">
        <Link href="/" className="mr-5 flex items-center" aria-label="Giga home">
          <Logo />
        </Link>

        {/* Desktop nav */}
        <nav aria-label="Primary" className="hidden flex-1 gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={pathname === l.href ? "page" : undefined}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-semibold text-ink/70 transition-colors hover:bg-secondary hover:text-ink",
                pathname === l.href && "bg-secondary text-ink",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-1 md:flex">
          {user ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                nativeButton={false}
                render={<Link href={primaryConsole(user)} />}
              >
                Dashboard
              </Button>
              <Link
                href="/settings"
                className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm font-medium text-ink transition-colors hover:bg-secondary"
              >
                <UserAvatar name={user.name} avatar={user.avatar} size="sm" decorative />
                <span className="hidden lg:inline">{user.name}</span>
              </Link>
              <Button variant="secondary" size="sm" onClick={signOut}>
                Sign out
              </Button>
            </>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              nativeButton={false}
              render={<Link href="/login" />}
            >
              Sign in
            </Button>
          )}
        </div>

        {/* Mobile trigger */}
        <div className="flex flex-1 justify-end md:hidden">
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
      </div>

      {/* Mobile menu */}
      {open && (
        <nav aria-label="Primary" className="space-y-1 border-t border-border px-4 py-3 md:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              aria-current={pathname === l.href ? "page" : undefined}
              className={cn(
                "block rounded-lg px-3 py-2 text-sm font-semibold",
                pathname === l.href
                  ? "bg-secondary text-ink"
                  : "text-ink/70 hover:bg-secondary hover:text-ink",
              )}
            >
              {l.label}
            </Link>
          ))}
          <div className="border-t border-border pt-2">
            {user ? (
              <>
                <Link
                  href={primaryConsole(user)}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2 text-sm font-semibold text-ink/70 hover:bg-secondary hover:text-ink"
                >
                  Dashboard
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-ink/70 hover:bg-secondary hover:text-ink"
                >
                  <UserAvatar name={user.name} avatar={user.avatar} size="sm" decorative />{" "}
                  {user.name}
                </Link>
                <button
                  type="button"
                  onClick={signOut}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-ink/70 hover:bg-secondary hover:text-ink"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-semibold text-brand hover:bg-secondary"
              >
                Sign in
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
