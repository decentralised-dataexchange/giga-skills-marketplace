import Link from 'next/link';

import { PORTALS } from '@/lib/portals';
import { SignOutButton } from '@/components/SignOutButton';

/** CivicWorks chrome: SaaS top bar with pill actions. */
export function CivicworksShell({
  active,
  children,
}: {
  active: 'verify' | 'history';
  children: React.ReactNode;
}) {
  const portal = PORTALS.civicworks;

  return (
    <>
      <header className="cw-header">
        <Link href="/civicworks/verify" className="cw-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={portal.logo} alt="" />
          Civic<em>Works</em> Talent
        </Link>
        <nav className="cw-nav">
          <Link href="/civicworks/verify" data-active={active === 'verify'}>
            Verify
          </Link>
          <Link href="/civicworks/history" data-active={active === 'history'}>
            History
          </Link>
          <SignOutButton redirectTo="/civicworks/login" />
        </nav>
      </header>
      <main className="cw-main">{children}</main>
      <footer className="cw-footer">{portal.footer}</footer>
    </>
  );
}
