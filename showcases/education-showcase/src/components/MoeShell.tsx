import Link from 'next/link';

import { PORTALS } from '@/lib/portals';
import { SignOutButton } from '@/components/SignOutButton';

const NAV = [
  { href: '/moe/approvals', key: 'approvals', label: 'Enrolment approvals' },
  { href: '/moe/issuance', key: 'issuance', label: 'Diploma issuance' },
  { href: '/moe/audit', key: 'audit', label: 'Audit timeline' },
] as const;

export type MoeNavKey = (typeof NAV)[number]['key'];

/** Ministry back office chrome: dark fixed sidebar with the registrar tools. */
export function MoeShell({
  active,
  userName,
  breadcrumb,
  children,
}: {
  active: MoeNavKey;
  userName: string;
  breadcrumb: string;
  children: React.ReactNode;
}) {
  const portal = PORTALS.moe;

  return (
    <>
      <aside className="moe-sidebar">
        <div className="moe-sidebar-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={portal.logo} alt="" />
          <div>
            <strong>{portal.organisation}</strong>
            <small>{portal.name}</small>
          </div>
        </div>
        <nav className="moe-nav">
          {NAV.map((item) => (
            <Link key={item.key} href={item.href} data-active={active === item.key}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="moe-sidebar-user">
          <div>{userName}</div>
          <SignOutButton redirectTo="/moe/login" />
        </div>
      </aside>
      <div className="moe-content">
        <div className="moe-breadcrumb">
          Ministry of Education / Registrar Back Office / {breadcrumb}
        </div>
        {children}
      </div>
    </>
  );
}
