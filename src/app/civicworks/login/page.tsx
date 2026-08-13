import { PORTALS } from '@/lib/portals';
import { DEMO_ACCOUNTS } from '@/lib/demo-accounts';
import { StaffLoginForm } from '@/components/StaffLoginForm';

export default function CivicworksLogin() {
  const portal = PORTALS.civicworks;

  return (
    <div className="cw-login">
      <div className="cw-login-pitch">
        <h1>Hire on verified qualifications, not photocopies.</h1>
        <p>
          CivicWorks Talent verifies education credentials straight from the
          candidate&apos;s wallet: cryptographic proof of issuer, integrity
          and revocation status, with only the fields you actually need.
        </p>
      </div>
      <div className="cw-login-form">
        <div className="cw-login-form-inner">
          <h2>Sign in</h2>
          <p>HR verification workspace</p>
          <StaffLoginForm
            homePath={portal.homePath}
            buttonLabel="Sign in"
            demoAccount={DEMO_ACCOUNTS.civicworks}
          />
        </div>
      </div>
    </div>
  );
}
