import Link from 'next/link';

import { CivicworksShell } from '@/components/CivicworksShell';
import { VerifyFlow } from '@/components/VerifyFlow';
import { readVerification } from '@/lib/verification';
import { getJob } from '@/lib/jobs';

const CLAIM_LABELS: Record<string, string> = {
  learnerName: 'Name',
  qualificationName: 'Qualification',
  qualificationCode: 'Qualification code',
  awardingInstitution: 'Awarding institution',
  awardDate: 'Award date',
};

/**
 * The application page for one posting, candidate perspective: prove your
 * qualification from your wallet; the result reads as an application
 * outcome, not a back-office verification record.
 */
export default async function CivicworksApply({
  searchParams,
}: {
  searchParams: Promise<{ ex?: string; job?: string }>;
}) {
  const { ex, job: jobSlug } = await searchParams;
  const job = getJob(jobSlug);
  const result = ex ? await readVerification(ex) : null;

  return (
    <CivicworksShell>
      <p className="cw-crumb">
        <Link href="/civicworks">← All openings</Link>
      </p>
      <h1>{job.title}</h1>
      <p className="cw-job-meta">
        {job.team} · {job.location} · {job.type} · {job.salary}
      </p>
      <p className="cw-lede">{job.blurb}</p>

      {result ? (
        <div className="cw-cards">
          <div
            className="cw-card"
            style={{
              borderColor: result.verified ? 'var(--ok)' : 'var(--bad)',
            }}
          >
            <h2>
              {result.verified
                ? 'Application received 🎉'
                : result.answered
                  ? 'We could not verify your diploma'
                  : 'Waiting for your answer'}
            </h2>
            <p>
              {result.verified
                ? `Your qualification is verified: trusted issuer, valid signature, and not revoked. Your application for ${job.title} is in; our team will be in touch.`
                : result.answered
                  ? 'The credential could not be verified. It may be revoked, tampered with, or from an issuer we do not trust. Contact your Ministry of Education if you believe this is wrong.'
                  : 'You have not answered the request in your wallet yet.'}
            </p>
            <ul style={{ marginTop: '0.75rem', paddingLeft: '1.1rem', fontSize: '0.85rem' }}>
              {result.checks.map((check) => (
                <li key={check.name} style={{ color: check.passed ? 'var(--ok)' : 'var(--bad)' }}>
                  {check.passed ? '✓' : '✗'} {check.name}
                  {check.detail ? `: ${check.detail}` : ''}
                </li>
              ))}
            </ul>
          </div>
          {Object.keys(result.claims).length > 0 ? (
            <div className="cw-card">
              <h2>What you shared</h2>
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
                Only these fields left your wallet.{' '}
                <span className="integration-badge real">Selective disclosure</span>
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="cw-cards">
          <div className="cw-card">
            <h2>Apply with your wallet</h2>
            <p>
              This role requires: {job.requirement}. Scan with the EUDI Wallet
              on your phone and approve sharing five fields: your name,
              qualification, awarding institution, qualification code and
              award date. Nothing else leaves your wallet.
            </p>
            <div style={{ marginTop: '1rem' }}>
              <VerifyFlow jobSlug={job.slug} />
            </div>
          </div>
          <div className="cw-card">
            <h2>Your privacy</h2>
            <p>
              Your wallet shows exactly which fields we ask for, and you
              approve or decline. We check the issuer, the signature and the
              revocation status{' '}
              <span className="integration-badge real">Real</span>; we never
              see anything you did not share.
            </p>
          </div>
        </div>
      )}
    </CivicworksShell>
  );
}
