import { PORTALS } from '@/lib/portals';
import { StaffLoginForm } from '@/components/StaffLoginForm';

export default function SchoolLogin() {
  const portal = PORTALS.school;

  return (
    <div className="sch-login">
      <div className="sch-login-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={portal.logo} alt="" />
        <h1>{portal.organisation}</h1>
        <p>Admissions office staff sign-in</p>
        <StaffLoginForm homePath={portal.homePath} buttonLabel="Open workbench" />
      </div>
    </div>
  );
}
