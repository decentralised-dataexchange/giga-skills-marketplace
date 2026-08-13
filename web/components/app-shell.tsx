"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Nav } from "@/components/nav";
import { Sidebar } from "@/components/sidebar";
import { DashboardTopbar } from "@/components/dashboard-topbar";
import { Footer } from "@/components/footer";

const CONSOLE_ROUTES = ["/provider", "/governance", "/settings"];

// Public-facing pages keep the marketing layout (top nav + centered content +
// footer). The logged-in consoles are a proper dashboard (left admin sidebar +
// full-width content).
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Sidebar rail visibility, toggled from the masthead hamburger and kept
  // across visits (the trust-list backoffice behaviour).
  const [sidebarOpen, setSidebarOpen] = useState(true);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restore persisted UI state on mount
    setSidebarOpen(localStorage.getItem("dashboard-nav-open") !== "0");
  }, []);
  function toggleSidebar() {
    setSidebarOpen((v) => {
      localStorage.setItem("dashboard-nav-open", v ? "0" : "1");
      return !v;
    });
  }

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
    // Backoffice chrome: brand-blue masthead over a light sidebar rail and a
    // grey working area; the content column is the only scroll region, with
    // the lean footer pinned beneath it.
    return (
      <div className="dashboard flex h-dvh flex-col bg-[#f4f6f9]">
        <DashboardTopbar onToggleSidebar={toggleSidebar} />
        <div className="flex min-h-0 flex-1">
          <Sidebar collapsed={!sidebarOpen} className="hidden md:flex" />
          <div className="flex min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain">
            <div id="main-content" className="flex-1">
              {children}
            </div>
            <Footer />
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
