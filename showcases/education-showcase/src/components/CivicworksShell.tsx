import Link from 'next/link';

import { PORTALS } from '@/lib/portals';

/**
 * CivicWorks chrome, candidate perspective: a public careers site header.
 * No sign-in and no back office; the candidate is the visitor.
 */
export function CivicworksShell({ children }: { children: React.ReactNode }) {
  const portal = PORTALS.civicworks;

  return (
    <>
      <header className="cw-header">
        <Link href="/civicworks" className="cw-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={portal.logo} alt="" />
          Civic<em>Works</em>
        </Link>
        <nav className="cw-nav">
          <Link href="/civicworks" data-active="false">
            Careers
          </Link>
          <Link href="/civicworks/verify" className="cw-pill" data-variant="ghost">
            Apply with your wallet
          </Link>
        </nav>
      </header>
      <main className="cw-main">{children}</main>
      <footer className="cw-footer">{portal.footer}</footer>
    </>
  );
}
