import { EducationShell } from '@/components/EducationShell';

/**
 * Wallet sign-in screen. In M2 this renders the OpenID4VP QR code and listens
 * on SSE for the verified presentation; until then it explains the flow.
 */
export default function EducationLogin() {
  return (
    <EducationShell signedIn={false}>
      <div className="edu-login">
        <div className="edu-card">
          <h1>Sign in with your wallet</h1>
          <p>
            Open the wallet on your phone and scan the code to present your
            person identification data (PID). We use it to confirm who you
            are; the registry keeps no copy of your identity attributes.
          </p>
          <div className="edu-qr-frame">
            <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
              QR code appears here
            </span>
          </div>
          <span className="integration-badge real">Real wallet flow</span>
        </div>
      </div>
    </EducationShell>
  );
}
