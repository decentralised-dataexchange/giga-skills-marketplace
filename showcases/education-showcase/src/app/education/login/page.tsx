import { EducationShell } from '@/components/EducationShell';
import { WalletLogin } from '@/components/WalletLogin';

/**
 * Wallet sign-in screen: OpenID4VP PID presentation via the Ministry sandbox.
 */
export default function EducationLogin() {
  return (
    <EducationShell signedIn={false}>
      <div className="edu-login">
        <WalletLogin />
      </div>
    </EducationShell>
  );
}
