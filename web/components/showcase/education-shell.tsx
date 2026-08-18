"use client";

import Link from "next/link";

import { PORTALS } from "@/lib/showcase/portals";
import { SignOutButton } from "@/components/showcase/sign-out-button";
import { useShowcaseStore } from "@/lib/showcase/use-store";

/**
 * The National Education Portal chrome: state banner, blue service header
 * with top navigation, and a government footer. Signed-in state comes from
 * the browser's fake learner session.
 */
export function EducationShell({ children }: { children: React.ReactNode }) {
  const portal = PORTALS.education;
  const { hydrated, sessionLearner } = useShowcaseStore();
  const signedIn = hydrated && sessionLearner !== null;

  return (
    <>
      <div className="edu-statebar">
        <span>An official education service</span>
        <span>English</span>
      </div>
      <header className="edu-header">
        <Link href="/showcase/education" className="edu-header-id">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={portal.logo} alt="" />
          <span className="edu-header-name">
            {portal.name}
            <span className="edu-header-org">{portal.organisation}</span>
          </span>
        </Link>
        <nav className="edu-nav">
          {signedIn ? (
            <>
              <Link href="/showcase/education/home">My education</Link>
              <Link href="/showcase/education/consents">My data choices</Link>
              <SignOutButton role="learner" redirectTo="/showcase/education" />
            </>
          ) : (
            <Link href="/showcase/education/login">Sign in with your wallet</Link>
          )}
        </nav>
      </header>
      <main className="edu-main">{children}</main>
      <footer className="edu-footer">{portal.footer}</footer>
    </>
  );
}
