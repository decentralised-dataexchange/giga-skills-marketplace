import { PORTALS } from '@/lib/portals';
import { StaffLoginForm } from '@/components/StaffLoginForm';

export default function MoeLogin() {
  const portal = PORTALS.moe;

  return (
    <div className="moe-login">
      <div className="moe-login-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={portal.logo} alt="" />
        <h1>{portal.organisation}</h1>
        <p>Registrar Back Office. Authorised personnel only.</p>
        <StaffLoginForm homePath={portal.homePath} buttonLabel="Enter back office" />
      </div>
    </div>
  );
}
