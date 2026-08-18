"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import { PORTALS } from "@/lib/showcase/portals";
import { SignOutButton } from "@/components/showcase/sign-out-button";
import { useShowcaseStore } from "@/lib/showcase/use-store";

/**
 * The National Education Portal chrome: state banner, blue service header
 * with top navigation, and a government footer. Signed-in state comes from
 * the browser's fake learner session. On narrow screens the nav items
 * collapse behind a hamburger button into a dropdown menu.
 */
export function EducationShell({ children }: { children: React.ReactNode }) {
  const portal = PORTALS.education;
  const { hydrated, sessionLearner } = useShowcaseStore();
  const signedIn = hydrated && sessionLearner !== null;
  const [menuOpen, setMenuOpen] = useState(false);
  const close = () => setMenuOpen(false);

  return (
    <>
      <div className="edu-statebar">
        <span>An official education service</span>
        <span>English</span>
      </div>
      <header className="edu-header">
        <Link href="/showcase/education" className="edu-header-id" onClick={close}>
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
        <button
          type="button"
          className="edu-menu-btn"
          aria-label={menuOpen ? "Close the menu" : "Open the menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>
      {menuOpen ? (
        <nav className="edu-menu">
          {signedIn ? (
            <>
              <Link href="/showcase/education/home" onClick={close}>
                My education
              </Link>
              <Link href="/showcase/education/consents" onClick={close}>
                My data choices
              </Link>
              <SignOutButton role="learner" redirectTo="/showcase/education" />
            </>
          ) : (
            <Link href="/showcase/education/login" onClick={close}>
              Sign in with your wallet
            </Link>
          )}
        </nav>
      ) : null}
      <main className="edu-main">{children}</main>
      <footer className="edu-footer">{portal.footer}</footer>
    </>
  );
}
