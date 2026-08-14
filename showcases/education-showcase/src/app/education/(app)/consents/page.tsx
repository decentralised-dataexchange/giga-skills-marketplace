import { getSession } from '@/lib/guards';
import { getLearnerByUserId } from '@/lib/registry';
import { getIndividualId, readConsents, type ConsentState } from '@/lib/consent';

import { deleteMyAccount, updateConsent } from './actions';

export default async function ConsentsPage() {
  const session = await getSession();
  const learner = session ? getLearnerByUserId(session.user.id) : undefined;
  const individualId = learner ? getIndividualId(learner.id) : undefined;
  let consents: ConsentState[] = [];
  if (individualId) {
    try {
      consents = await readConsents(individualId);
    } catch {
      consents = [];
    }
  }

  return (
    <>
      <section className="edu-hero">
        <h1>Your data choices</h1>
        <p>
          These agreements govern how the education service handles your data.
          The two optional ones are yours to change at any time; withdrawing
          never affects your enrolment or your credentials.
        </p>
      </section>

      {consents.length === 0 ? (
        <div className="edu-card">
          <h2>No records yet</h2>
          <p>
            Your consent records appear here after you submit your
            registration.
          </p>
        </div>
      ) : (
        consents.map((consent) => (
          <div className="edu-card" key={consent.key}>
            <h2>{consent.title}</h2>
            <p>{consent.description}</p>
            <p style={{ marginTop: '0.6rem', fontSize: '0.85rem' }}>
              Lawful basis: <strong>{consent.lawfulBasis}</strong>
              {' · '}
              Status:{' '}
              <strong style={{ color: consent.optIn ? 'var(--ok)' : 'var(--muted)' }}>
                {consent.optional
                  ? consent.optIn
                    ? 'allowed'
                    : 'declined / withdrawn'
                  : 'active (public task)'}
              </strong>
            </p>
            {consent.optional ? (
              <form action={updateConsent} style={{ marginTop: '0.75rem' }}>
                <input type="hidden" name="agreement" value={consent.key} />
                <input type="hidden" name="optIn" value={consent.optIn ? 'false' : 'true'} />
                <button
                  type="submit"
                  style={{
                    background: consent.optIn ? 'transparent' : 'var(--brand)',
                    color: consent.optIn ? 'var(--bad)' : '#fff',
                    border: consent.optIn ? '1.5px solid var(--bad)' : 0,
                    borderRadius: 8,
                    padding: '0.5rem 1.1rem',
                    fontWeight: 600,
                  }}
                >
                  {consent.optIn ? 'Opt out' : 'Opt in'}
                </button>
              </form>
            ) : null}
          </div>
        ))
      )}

      {learner ? (
        <div className="edu-card">
          <h2>Delete my account</h2>
          <p>
            Removes your learner profile, your application, and your consent
            records from this service, and signs you out. Credentials already
            in your wallet stay in your wallet; a revoked credential stays
            revoked.
          </p>
          <form action={deleteMyAccount} style={{ marginTop: '0.75rem' }}>
            <button
              type="submit"
              style={{
                background: 'var(--bad)',
                color: '#fff',
                border: 0,
                borderRadius: 8,
                padding: '0.5rem 1.1rem',
                fontWeight: 600,
              }}
            >
              Delete my account
            </button>
          </form>
        </div>
      ) : null}

    </>
  );
}
