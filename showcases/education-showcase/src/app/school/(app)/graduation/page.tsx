import { SchoolShell } from '@/components/SchoolShell';
import { getSession } from '@/lib/guards';
import { listApplications } from '@/lib/registry';

import { submitGraduationDecision } from './actions';

/**
 * Graduation decisions: the school signs a decision (the sandbox TSP stands
 * in for a qualified signature), and the decision text is hashed; the hash
 * is referenced inside the Ministry-issued diploma credential.
 */
export default async function SchoolGraduation() {
  const session = await getSession();
  const ready = listApplications(['approved']);
  const sent = listApplications(['graduation_submitted', 'payment_pending', 'issued']);

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
                Signed by the institution{' '}
                <span className="integration-badge sandbox">Sandbox TSP signature</span>
              </p>
              <button
                type="submit"
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
      </section>
    </SchoolShell>
  );
}
