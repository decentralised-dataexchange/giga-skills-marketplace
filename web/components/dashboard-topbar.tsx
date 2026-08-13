"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "@/components/icons";
import { useSession } from "@/lib/client";
import { Logo } from "@/components/logo";
import { AccountMenu } from "@/components/account-menu";
import { DASHBOARD_ITEMS } from "@/components/nav-links";
import { cn } from "@/lib/utils";

// Dashboard masthead in the NXD trust-list layout on a subtle grey bar:
// hamburger + wordmark in the left corner and the account block in the right
// corner. The hamburger collapses the sidebar rail on desktop and opens the
// navigation drawer on small screens.
export function DashboardTopbar({
  className,
  onToggleSidebar,
}: {
  className?: string;
  onToggleSidebar?: () => void;
}) {
  const pathname = usePathname();
  const user = useSession();
  const [open, setOpen] = useState(false);

  function onHamburger() {
    if (window.matchMedia("(min-width: 768px)").matches) onToggleSidebar?.();
    else setOpen((v) => !v);
  }

  return (
    <header
      className={cn("z-20 border-b border-[#e0e0e0] bg-[#f5f5f7] text-ink shadow-sm", className)}
    >
      <div className="flex min-h-16 items-center gap-3 px-4 md:min-h-20 md:px-8">
        {/* Left corner: sidebar hamburger (signed in only) + wordmark */}
        {user && (
          <button
            type="button"
            aria-label="Toggle navigation"
            onClick={onHamburger}
            className="grid size-9 shrink-0 place-items-center rounded-lg transition-colors hover:bg-black/5"
          >
            {open ? <X className="size-7" /> : <Menu className="size-7" />}
          </button>
        )}
        <Link href="/" className="flex items-center gap-3" aria-label="Giga home">
          <Logo className="h-11 md:h-12" />
          <span className="hidden font-heading text-[clamp(1rem,2vw,1.4rem)] font-semibold tracking-tight sm:inline">
            Skills <span className="text-muted-foreground">Marketplace</span>
          </span>
        </Link>

        <div className="flex-1" />

        {/* Right corner: the signed-in account block */}
        {user && <AccountMenu user={user} />}
      </div>

      {/* Small-screen navigation drawer: the flat NXD-style rail, in white */}
      {open && (
        <nav
          aria-label="Dashboard"
          className="max-h-[70vh] overflow-y-auto border-t border-[#e0e0e0] bg-white px-4 py-3 text-ink md:hidden"
        >
          {DASHBOARD_ITEMS.filter((l) => l.show(user)).map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              aria-current={pathname === l.href ? "page" : undefined}
              className={cn(
                "block rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-[0.66px] text-[#58585d] hover:bg-black/5 hover:text-black",
                pathname === l.href && "bg-black/5 text-black",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
