"use client";

import Link from "next/link";

import { PORTALS } from "@/lib/showcase/portals";
import { SignOutButton } from "@/components/showcase/sign-out-button";
import { useShowcaseStore } from "@/lib/showcase/use-store";

/**
 * The Riverside Admissions chrome: crest header, tab navigation, footer.
 * The signed-in officer's name comes from the browser's fake session.
 */
export function SchoolShell({
  active,
  children,
}: {
  active: "queue" | "graduation";
  children: React.ReactNode;
}) {
  const portal = PORTALS.school;
  const { sessionSchool } = useShowcaseStore();

  return (
    <>
      <header className="sch-header">
        <div className="sch-header-top">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={portal.logo} alt="" />
          <div>
            <span className="sch-title">{portal.organisation}</span>
            <span className="sch-subtitle">{portal.name} workbench</span>
          </div>
          <div className="sch-user">
            <span>{sessionSchool?.name ?? "Officer"}</span>
            <SignOutButton role="school" redirectTo="/showcase/school/login" />
          </div>
        </div>
        <nav className="sch-tabs">
          <Link href="/showcase/school/queue" data-active={active === "queue"}>
            Review queue
          </Link>
          <Link href="/showcase/school/graduation" data-active={active === "graduation"}>
            Graduation decisions
          </Link>
        </nav>
      </header>
      <main className="sch-main">{children}</main>
      <footer className="sch-footer">{portal.footer}</footer>
    </>
  );
}
