import Link from 'next/link';

import { SchoolShell } from '@/components/SchoolShell';
import { getSession } from '@/lib/guards';
import { getApplication, listApplications } from '@/lib/registry';

import { validateDocuments } from './actions';

/**
 * The manual document review the RFQ requires: the officer opens an
 * application, checks the document references against the sandbox civil
 * registry, and validates it for the Ministry.
 */
export default async function SchoolQueue({
  searchParams,
}: {
  searchParams: Promise<{ app?: string }>;
}) {
  const session = await getSession();
  const { app: selectedId } = await searchParams;
  const queue = listApplications(['submitted', 'school_validated']);
  const selected = selectedId ? getApplication(selectedId) : undefined;
  const form = selected ? (JSON.parse(selected.form) as Record<string, unknown>) : {};
  const documents = selected ? (JSON.parse(selected.documents) as string[]) : [];

  return (
    <SchoolShell active="queue" userName={session?.user.name ?? 'Officer'}>
      <div className="sch-workbench">
        <aside className="sch-queue">
          <div className="sch-queue-head">Applications</div>
          {queue.length === 0 ? (
            <p className="sch-queue-empty">
              No applications yet. New learner registrations appear here for
              manual document review.
            </p>
          ) : (
            queue.map((item) => (
              <Link key={item.id} className="sch-queue-item" href={`/school/queue?app=${item.id}`}>
                <strong>{item.learnerName}</strong>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                  {item.status === 'submitted' ? 'Awaiting review' : 'Validated'} ·{' '}
                  {item.createdAt.slice(0, 10)}
                </div>
              </Link>
            ))
          )}
        </aside>
        <section className="sch-detail">
          {!selected ? (
            <>
              <h1>Manual document review</h1>
              <p>
                Select an application from the queue to check the uploaded
                documents against the civil registry{' '}
                <span className="integration-badge sandbox">Sandbox</span> and
                confirm prior education records before the Ministry approves
                the enrolment.
              </p>
            </>
          ) : (
            <>
              <h1>{selected.learnerName}</h1>
              <p>
                Applied to {selected.institutionName} · submitted{' '}
                {selected.createdAt.slice(0, 10)}
              </p>

              <h2 style={{ marginTop: '1.25rem', fontSize: '0.95rem' }}>
                Application as submitted
              </h2>
              <form className="sch-review-form">
                <div className="sch-review-grid">
                  <label>
                    <span>First name</span>
                    <input disabled value={String(form.firstName ?? '')} />
                  </label>
                  <label>
                    <span>Family name</span>
                    <input disabled value={String(form.familyName ?? '')} />
                  </label>
                  <label>
                    <span>Date of birth</span>
                    <input disabled value={String(form.dateOfBirth ?? '')} />
                  </label>
                  <label>
                    <span>Contact email</span>
                    <input disabled value={String(form.email ?? '')} />
                  </label>
                  <label className="sch-review-wide">
                    <span>Home address</span>
                    <input disabled value={String(form.address ?? '')} />
                  </label>
                  <label>
                    <span>School</span>
                    <input disabled value={selected.institutionName} />
                  </label>
                  <label>
                    <span>Prior education</span>
                    <input disabled value={String(form.priorEducation || 'None given')} />
                  </label>
                  <label className="sch-review-wide">
                    <span>Disability or special support needs</span>
                    <input disabled value={String(form.specialSupport || 'None given')} />
                  </label>
                </div>
                <div className="sch-review-consents">
                  <label className="sch-review-check">
                    <input type="checkbox" disabled checked={form.consentAnalytics === true} />
                    Anonymised analytics for policy planning (optional)
                  </label>
                  <label className="sch-review-check">
                    <input
                      type="checkbox"
                      disabled
                      checked={form.consentEmployerSharing === true}
                    />
                    Later qualification sharing with an employer (optional)
                  </label>
                </div>
              </form>

              <h2 style={{ marginTop: '1.25rem', fontSize: '0.95rem' }}>Documents</h2>
              <ul style={{ margin: '0.5rem 0 1rem 1.2rem', fontSize: '0.85rem' }}>
                {documents.map((doc) => (
                  <li key={doc}>
                    {doc}{' '}
                    <span className="integration-badge sandbox">
                      Civil registry: passed
                    </span>
                  </li>
                ))}
              </ul>
              {selected.status === 'submitted' ? (
                <form action={validateDocuments}>
                  <input type="hidden" name="applicationId" value={selected.id} />
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
                    Validate documents and forward to the Ministry
                  </button>
                </form>
              ) : (
                <p style={{ color: 'var(--ok)', fontWeight: 600 }}>
                  Validated. Awaiting the Ministry registrar.
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </SchoolShell>
  );
}
