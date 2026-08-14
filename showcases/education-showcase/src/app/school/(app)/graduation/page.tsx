import { SchoolShell } from '@/components/SchoolShell';
import { getSession } from '@/lib/guards';
import { getDiplomaExchange, listApplications } from '@/lib/registry';

import { revokeIssuedDiploma, submitGraduationDecision } from './actions';

/**
 * Graduation decisions: the school signs a decision (the sandbox TSP stands
 * in for a qualified signature), and the decision text is hashed; the hash
 * is referenced inside the diploma credential. Submission is processed by
 * the registry automatically: the institution is checked against the
 * Education Service Registry and the diploma fee falls due for the learner.
 * Revocation of an issued diploma is also requested here and processed
 * immediately.
 */
export default async function SchoolGraduation() {
  const session = await getSession();
  const ready = listApplications(['approved']);
  const sent = listApplications(['payment_pending', 'issued']);

  return (
    <SchoolShell active="graduation" userName={session?.user.name ?? 'Officer'}>
      <section className="sch-detail">
        <h1>Graduation decisions</h1>
        {ready.length === 0 ? (
          <p>
            No approved learners are awaiting a graduation decision.
            {sent.length > 0
              ? ` ${sent.length} decision(s) already submitted.`
              : ''}
          </p>
        ) : (
          ready.map((app) => (
            <form
              key={app.id}
              action={submitGraduationDecision}
              style={{ borderTop: '1px solid var(--line)', paddingTop: '1rem', marginTop: '1rem' }}
            >
              <input type="hidden" name="applicationId" value={app.id} />
              <h2 style={{ fontSize: '1rem' }}>{app.learnerName}</h2>
              <label>
                <span>Programme</span>
                <input name="programme" defaultValue="Upper Secondary Diploma, Natural Sciences" required />
              </label>
              <label>
                <span>Qualification code</span>
                <input name="qualificationCode" defaultValue="NQF-4-NATSCI" required />
              </label>
              <label>
                <span>Final result</span>
                <input name="result" defaultValue="Pass with distinction" required />
              </label>
              <label>
                <span>Signed decision text (hashed and referenced in the diploma)</span>
                <textarea
                  name="decisionText"
                  rows={3}
                  style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 8, padding: '0.5rem' }}
                  defaultValue={`Graduation decision for ${app.learnerName}: programme completed, board decision 2026-06-12.`}
                />
              </label>
              <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: '0.5rem 0' }}>
                Signed by the institution. On submission the registry
                validates the institution and
                asks the learner to pay the diploma fee; the diploma is
                issued to their wallet in the same payment step.
              </p>
              <button
                type="submit"
                className="hint-pulse"
                style={{
                  background: 'var(--brand)',
                  color: '#fff',
                  border: 0,
                  borderRadius: 999,
                  padding: '0.55rem 1.3rem',
                  fontWeight: 700,
                }}
              >
                Submit signed graduation decision
              </button>
            </form>
          ))
        )}
        {sent.length > 0 ? (
          <>
            <h2 style={{ marginTop: '1.5rem', fontSize: '1rem' }}>Submitted decisions</h2>
            {sent.map((app) => {
              const exchange = getDiplomaExchange(app.id);
              const issued = app.status === 'issued' && !exchange?.revoked;
              return (
                <div
                  key={app.id}
                  style={{ borderTop: '1px solid var(--line)', paddingTop: '0.9rem', marginTop: '0.9rem' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem',
                    }}
                  >
                    <strong>{app.learnerName}</strong>
                    {issued ? (
                      <form action={revokeIssuedDiploma} style={{ margin: 0 }}>
                        <input type="hidden" name="applicationId" value={app.id} />
                        <button
                          type="submit"
                          style={{
                            background: 'var(--bad)',
                            color: '#fff',
                            border: 0,
                            borderRadius: 999,
                            padding: '0.3rem 0.9rem',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            width: 'auto',
                            marginTop: 0,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Revoke the diploma
                        </button>
                      </form>
                    ) : null}
                  </div>
                  {app.status === 'payment_pending' ? (
                    <p style={{ margin: '0.35rem 0 0' }}>
                      Awaiting the learner&apos;s fee payment; the diploma is
                      issued to their wallet in the same step.
                    </p>
                  ) : exchange?.revoked ? (
                    <p style={{ margin: '0.35rem 0 0', color: 'var(--bad)', fontWeight: 600 }}>
                      Diploma revoked
                      {exchange?.revokedAt
                        ? ` on ${String(exchange.revokedAt).slice(0, 10)}`
                        : ''}
                      . Fresh verifications reject it.
                    </p>
                  ) : (
                    <>
                      <p style={{ margin: '0.35rem 0 0', color: 'var(--ok)', fontWeight: 600 }}>
                        Diploma issued to the learner&apos;s wallet.
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: '0.4rem 0 0' }}>
                        Revocation is permanent and takes effect immediately: a
                        fresh verification anywhere rejects the credential.
                      </p>
                    </>
                  )}
                </div>
              );
            })}
          </>
        ) : null}
      </section>
    </SchoolShell>
  );
}
