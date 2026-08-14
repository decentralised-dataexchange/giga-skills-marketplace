import { PORTALS } from '@/lib/portals';
import { DEMO_ACCOUNTS } from '@/lib/demo-accounts';
import { StaffLoginForm } from '@/components/StaffLoginForm';

export default function DpaLogin() {
  const portal = PORTALS.dpa;

  return (
    <div className="dpa-login">
      <h1>{portal.organisation}</h1>
      <p>
        Consent oversight sign-in. Access is limited to authorised supervisory
        staff and is recorded.
      </p>
      <StaffLoginForm
        homePath={portal.homePath}
        buttonLabel="Sign in"
        demoAccount={DEMO_ACCOUNTS.dpa}
      />
    </div>
  );
}
