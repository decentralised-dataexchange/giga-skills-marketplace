import Link from 'next/link';

import { PORTALS } from '@/lib/portals';
import { SignOutButton } from '@/components/SignOutButton';

/**
 * The National Education Portal chrome: state banner, blue service header
 * with top navigation, and a government footer.
 */
export function EducationShell({
  signedIn,
  children,
}: {
  signedIn: boolean;
  children: React.ReactNode;
}) {
  const portal = PORTALS.education;

  return (
    <>
      <div className="edu-statebar">
        <span>An official education service</span>
        <span>English</span>
      </div>
      <header className="edu-header">
        <Link href="/education" className="edu-header-id">
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
              <Link href="/education/home">My education</Link>
              <Link href="/education/consents">My data choices</Link>
              <SignOutButton redirectTo="/education" />
            </>
          ) : (
            <Link href="/education/login">Sign in with your wallet</Link>
          )}
        </nav>
      </header>
      <main className="edu-main">{children}</main>
      <footer className="edu-footer">{portal.footer}</footer>
    </>
  );
}
