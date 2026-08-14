import { redirect } from 'next/navigation';

import { PORTALS } from '@/lib/portals';
import { DEMO_ACCOUNTS } from '@/lib/demo-accounts';
import { StaffLoginForm } from '@/components/StaffLoginForm';
import { hasRestorableSession } from '@/lib/portal-sessions';

export default async function SchoolLogin() {
  const portal = PORTALS.school;

  // A still-valid stashed officer session skips the sign-in: the workbench
  // swaps it back in through the middleware.
  if (await hasRestorableSession('school_officer')) {
    redirect(portal.homePath);
  }

  return (
    <div className="sch-login">
      <div className="sch-login-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={portal.logo} alt="" />
        <h1>{portal.organisation}</h1>
        <p>Admissions office staff sign-in</p>
        <StaffLoginForm
          homePath={portal.homePath}
          buttonLabel="Open workbench"
          demoAccount={DEMO_ACCOUNTS.school}
        />
      </div>
    </div>
  );
}
