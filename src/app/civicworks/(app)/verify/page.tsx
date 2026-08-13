import { CivicworksShell } from '@/components/CivicworksShell';

export default function CivicworksVerify() {
  return (
    <CivicworksShell active="verify">
      <h1>Verify a qualification</h1>
      <p className="cw-lede">
        Ask a candidate to share their diploma from their wallet. You request
        five fields only: name, qualification, awarding institution,
        qualification code and award date. Nothing else leaves their wallet.
      </p>
      <div className="cw-cards">
        <div className="cw-card">
          <h2>Start a verification</h2>
          <p>
            Generates a request QR code for the candidate to scan.
            Results arrive live with issuer, signature and revocation checks.{' '}
            <span className="integration-badge real">Real</span>
          </p>
          <span className="cw-pill" data-variant="ghost">
            Available after issuance is live
          </span>
        </div>
        <div className="cw-card">
          <h2>What the candidate sees</h2>
          <p>
            Their wallet shows exactly which fields you asked for and lets
            them approve or decline. Selective disclosure keeps grades, birth
            dates and identifiers private.
          </p>
        </div>
      </div>
    </CivicworksShell>
  );
}
