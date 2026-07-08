"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { api, auth, useSession, type SessionUser } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { SettingsDialog } from "@/components/settings-dialog";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Marketplace", show: () => true },
  { href: "/builder", label: "App Builder", show: () => true },
  { href: "/provider", label: "Provider Console", show: (u: SessionUser | null) => u?.role === "provider" },
  {
    href: "/governance",
    label: "Governance",
    show: (u: SessionUser | null) => u != null && ["reviewer", "superadmin"].includes(u.role),
  },
];

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useSession();
  const [settingsOpen, setSettingsOpen] = useState(false);

  async function signOut() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    auth.signOut();
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-1 px-5">
        <Link href="/" className="mr-4 whitespace-nowrap text-[15px] font-semibold tracking-tight">
          GovBuild<span className="text-muted-foreground">·</span>Skills
        </Link>
        <nav className="flex flex-1 gap-1">
          {LINKS.filter((l) => l.show(user)).map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                pathname === l.href && "bg-secondary text-foreground",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        {user ? (
          <>
            <span className="mr-1 hidden text-sm text-muted-foreground sm:inline">
              {user.name} · {user.role}
            </span>
            <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)}>
              Settings
            </Button>
            <Button variant="secondary" size="sm" onClick={signOut}>
              Sign out
            </Button>
          </>
        ) : (
          <Button variant="secondary" size="sm" nativeButton={false} render={<Link href="/login" />}>Sign in</Button>
        )}
      </div>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </header>
  );
}
