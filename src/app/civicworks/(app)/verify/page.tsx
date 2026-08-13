import { CivicworksShell } from '@/components/CivicworksShell';
import { VerifyFlow } from '@/components/VerifyFlow';
import { readVerification } from '@/lib/verification';

const CLAIM_LABELS: Record<string, string> = {
  learnerName: 'Name',
  qualificationName: 'Qualification',
  qualificationCode: 'Qualification code',
  awardingInstitution: 'Awarding institution',
  awardDate: 'Award date',
};

export default async function CivicworksVerify({
  searchParams,
}: {
  searchParams: Promise<{ ex?: string }>;
}) {
  const { ex } = await searchParams;
  const result = ex ? await readVerification(ex) : null;

  return (
    <CivicworksShell active="verify">
      <h1>Verify a qualification</h1>
      <p className="cw-lede">
        Ask a candidate to share their diploma from their wallet. You request
        five fields only: name, qualification, awarding institution,
        qualification code and award date. Date of birth, address, learner
        identifier, email and grade are never requested.
      </p>

      {result ? (
        <div className="cw-cards">
          <div
            className="cw-card"
            style={{
              borderTop: `4px solid ${result.verified ? 'var(--ok)' : 'var(--bad)'}`,
            }}
          >
            <h2>
              {result.verified ? 'Verified' : result.answered ? 'Rejected' : 'No answer yet'}
            </h2>
            <p>
              {result.verified
                ? 'The diploma is authentic: trusted issuer, valid signature, and not revoked.'
                : result.answered
                  ? 'The presentation did not verify. The credential may be revoked, tampered with, or from an untrusted issuer.'
                  : 'The candidate has not answered this request yet.'}
            </p>
            <ul style={{ marginTop: '0.75rem', paddingLeft: '1.1rem', fontSize: '0.85rem' }}>
              {result.checks.map((check) => (
                <li key={check.name} style={{ color: check.passed ? 'var(--ok)' : 'var(--bad)' }}>
                  {check.passed ? '✓' : '✗'} {check.name}
                  {check.detail ? ` — ${check.detail}` : ''}
                </li>
              ))}
            </ul>
          </div>
          {Object.keys(result.claims).length > 0 ? (
            <div className="cw-card">
              <h2>Disclosed fields</h2>
              <table style={{ width: '100%', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                <tbody>
                  {Object.entries(CLAIM_LABELS).map(([key, label]) =>
                    result.claims[key] ? (
                      <tr key={key}>
                        <td style={{ color: 'var(--muted)', padding: '0.25rem 0.75rem 0.25rem 0' }}>
                          {label}
                        </td>
                        <td style={{ fontWeight: 600 }}>{result.claims[key]}</td>
                      </tr>
                    ) : null
                  )}
                </tbody>
              </table>
              <p style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--muted)' }}>
                Only these fields left the candidate&apos;s wallet.{' '}
                <span className="integration-badge real">Selective disclosure</span>
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="cw-cards">
          <div className="cw-card">
            <h2>Start a verification</h2>
            <p>
              Generates a request QR for the candidate. Results arrive live
              with issuer, signature and revocation checks{' '}
              <span className="integration-badge real">Real</span>.
            </p>
            <div style={{ marginTop: '1rem' }}>
              <VerifyFlow />
            </div>
          </div>
          <div className="cw-card">
            <h2>What the candidate sees</h2>
            <p>
              Their wallet shows exactly which fields you asked for and lets
              them approve or decline. Selective disclosure keeps grades,
              birth dates and identifiers private.
            </p>
          </div>
        </div>
      )}
    </CivicworksShell>
  );
}
