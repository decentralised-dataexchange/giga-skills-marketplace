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
 * The job detail and application page, candidate perspective: a full role
 * description, a prefilled application form, and the wallet proof as the
 * qualification step. The result reads as an application outcome.
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
      <div className="cw-job-tags" style={{ marginTop: '0.6rem' }}>
        {job.tags.map((tag) => (
          <span key={tag} className="cw-tag">
            {tag}
          </span>
        ))}
      </div>

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
                ? 'Application received'
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
        <div className="cw-apply-grid">
          <div className="cw-detail">
            <section>
              <h2>About the role</h2>
              <p>{job.about}</p>
            </section>
            <section>
              <h2>What you will do</h2>
              <ul>
                {job.responsibilities.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
            <section>
              <h2>What we offer</h2>
              <ul>
                {job.offer.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
            <section>
              <h2>Requirements</h2>
              <p>{job.requirement}.</p>
            </section>
          </div>

          <aside className="cw-apply-card">
            <h2>Your application</h2>
            <form>
              <label>
                <span>Full name</span>
                <input name="name" defaultValue="Alex Andersson" />
              </label>
              <label>
                <span>Email</span>
                <input name="email" type="email" defaultValue="alex.andersson@mail.example" />
              </label>
              <label>
                <span>Phone</span>
                <input name="phone" defaultValue="+46 70 123 45 67" />
              </label>
              <label>
                <span>Message (optional)</span>
                <textarea
                  name="message"
                  rows={3}
                  defaultValue="I recently graduated and would love to join the analytics team."
                />
              </label>
            </form>
            <div className="cw-apply-divider" />
            <h3>Qualification</h3>
            <p className="cw-apply-note">
              This role requires an upper secondary diploma. Prove it from
              your wallet: you approve sharing five fields, and nothing else
              leaves your phone.
            </p>
            <VerifyFlow jobSlug={job.slug} />
          </aside>
        </div>
      )}
    </CivicworksShell>
  );
}
