import { PORTALS } from '@/lib/portals';
import { SignOutButton } from '@/components/SignOutButton';

/** Data Protection Authority chrome: masthead, reading column, footer. */
export function DpaShell({
  userName,
  children,
}: {
  userName: string;
  children: React.ReactNode;
}) {
  const portal = PORTALS.dpa;

  return (
    <>
      <header className="dpa-masthead">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={portal.logo} alt="" />
        <div>
          <span className="dpa-masthead-name">
            {portal.organisation}
            <span className="dpa-masthead-role">{portal.name}</span>
          </span>
        </div>
        <div className="dpa-session">
          <span>{userName}</span>
          <SignOutButton redirectTo="/dpa/login" />
        </div>
      </header>
      <main className="dpa-main">{children}</main>
      <footer className="dpa-footer">{portal.footer}</footer>
    </>
  );
}
