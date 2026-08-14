import Link from 'next/link';

import { PORTALS } from '@/lib/portals';
import { SignOutButton } from '@/components/SignOutButton';

/**
 * The Riverside Admissions chrome: crest header, tab navigation, footer.
 */
export function SchoolShell({
  active,
  userName,
  children,
}: {
  active: 'queue' | 'graduation';
  userName: string;
  children: React.ReactNode;
}) {
  const portal = PORTALS.school;

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
            <span>{userName}</span>
            <SignOutButton redirectTo="/school/login" />
          </div>
        </div>
        <nav className="sch-tabs">
          <Link href="/school/queue" data-active={active === 'queue'}>
            Review queue
          </Link>
          <Link href="/school/graduation" data-active={active === 'graduation'}>
            Graduation decisions
          </Link>
        </nav>
      </header>
      <main className="sch-main">{children}</main>
      <footer className="sch-footer">{portal.footer}</footer>
    </>
  );
}
