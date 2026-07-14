"use client";

import { usePathname } from "next/navigation";
import { Nav } from "@/components/nav";
import { Sidebar } from "@/components/sidebar";
import { DashboardTopbar } from "@/components/dashboard-topbar";
import { Footer } from "@/components/footer";

const CONSOLE_ROUTES = ["/developer", "/builder", "/provider", "/governance", "/settings"];

// Public-facing pages keep the marketing layout (top nav + centered content +
// footer). The logged-in consoles are a proper dashboard (left admin sidebar +
// full-width content).
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // The dashboard sign-in is a standalone screen (its own chrome, no marketing
  // nav and no sidebar): the entry point to the dashboard "site".
  if (pathname === "/login") {
    return (
      <div id="main-content" className="flex min-h-full flex-1 flex-col">
        {children}
      </div>
    );
  }

  const isConsole = CONSOLE_ROUTES.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (isConsole) {
    return (
      <div className="flex min-h-full flex-1">
        <Sidebar className="hidden md:flex" />
        <div className="flex min-w-0 flex-1 flex-col">
          <DashboardTopbar className="md:hidden" />
          <div id="main-content" className="flex-1">
            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Nav />
      <div id="main-content" className="flex flex-1 flex-col">
        {children}
      </div>
      <Footer />
    </>
  );
}
