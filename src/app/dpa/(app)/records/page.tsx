import { DpaShell } from '@/components/DpaShell';
import { getSession } from '@/lib/guards';
import { getDb } from '@/lib/db';
import { readConsents, type ConsentState } from '@/lib/consent';

import { eraseConsents } from './actions';

/**
 * Consent oversight: the supervisory view over every onboarded learner's
 * agreements, and the erasure procedure. The individual ids never render;
 * learners appear under their pseudonymous display names.
 */
export default async function DpaRecords() {
  const session = await getSession();

  const links = getDb()
    .prepare(
      `SELECT c."learnerId", c."individualId", c."createdAt", l."displayName"
       FROM "consent_links" c JOIN "learners" l ON l."id" = c."learnerId"
       ORDER BY c."createdAt" DESC`
    )
    .all() as Array<{
    learnerId: string;
    individualId: string;
    createdAt: string;
    displayName: string;
  }>;

  const withConsents: Array<{
    learnerId: string;
    displayName: string;
    createdAt: string;
    consents: ConsentState[];
  }> = [];
  for (const link of links) {
    let consents: ConsentState[] = [];
    try {
      consents = await readConsents(link.individualId);
    } catch {
      consents = [];
    }
    withConsents.push({
      learnerId: link.learnerId,
      displayName: link.displayName,
      createdAt: link.createdAt,
      consents,
    });
  }

  return (
    <DpaShell userName={session?.user.name ?? 'Supervisor'}>
      <h1>Consent oversight</h1>
      <p>
        This office supervises the data agreements under which the National
        Learner Registry processes learner data: the enrolment processing
        notice (public task), the optional anonymised analytics agreement
        (consent) and the employer qualification-sharing agreement (consent).
      </p>
      <p className="dpa-note">
        Records come live from the Consent Building Block{' '}
        <span className="integration-badge real">Real</span>. Individual
        identifiers stay server-side; learners are shown by display name only.
      </p>

      <h2>Consent records</h2>
      {withConsents.length === 0 ? (
        <p>
          No learner has been onboarded yet. Records appear once a learner
          completes registration.
        </p>
      ) : (
        withConsents.map((entry) => (
          <div key={entry.learnerId} style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', margin: '1rem 0 0.25rem' }}>
              {entry.displayName}
              <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: '0.8rem' }}>
                {' '}
                · onboarded {entry.createdAt.slice(0, 10)}
              </span>
            </h3>
            <ul className="dpa-list">
              {entry.consents.map((consent) => (
                <li key={consent.key}>
                  <span>
                    {consent.title}
                    <span style={{ color: 'var(--muted)' }}> ({consent.lawfulBasis})</span>
                  </span>
                  <strong style={{ color: consent.optIn ? 'var(--ok)' : 'var(--muted)' }}>
                    {consent.optional
                      ? consent.optIn
                        ? 'allowed'
                        : 'declined / withdrawn'
                      : 'active'}
                  </strong>
                </li>
              ))}
            </ul>
            <form action={eraseConsents} style={{ marginTop: '0.5rem' }}>
              <input type="hidden" name="learnerId" value={entry.learnerId} />
              <button
                type="submit"
                style={{
                  background: 'transparent',
                  border: '1.5px solid var(--bad)',
                  color: 'var(--bad)',
                  padding: '0.4rem 1rem',
                  fontSize: '0.8rem',
                }}
              >
                Erase all consent records (right to be forgotten)
              </button>
            </form>
          </div>
        ))
      )}

      <h2>Scope of this procedure</h2>
      <p>
        Erasure removes the consent records held by the Consent Building
        Block. Registry records and issued credentials follow their own
        retention rules and are out of scope for this procedure.
      </p>
    </DpaShell>
  );
}
