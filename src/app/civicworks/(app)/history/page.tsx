import { CivicworksShell } from '@/components/CivicworksShell';

export default function CivicworksHistory() {
  return (
    <CivicworksShell active="history">
      <h1>Verification history</h1>
      <p className="cw-lede">
        Every verification this workspace has run, with its outcome and
        revocation status at the time of checking.
      </p>
      <div className="cw-cards">
        <div className="cw-card">
          <h2>No verifications yet</h2>
          <p>Completed verifications appear here.</p>
        </div>
      </div>
    </CivicworksShell>
  );
}
