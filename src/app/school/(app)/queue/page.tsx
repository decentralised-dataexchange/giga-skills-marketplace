import { SchoolShell } from '@/components/SchoolShell';
import { getSession } from '@/lib/guards';

export default async function SchoolQueue() {
  const session = await getSession();

  return (
    <SchoolShell active="queue" userName={session?.user.name ?? 'Officer'}>
      <div className="sch-workbench">
        <aside className="sch-queue">
          <div className="sch-queue-head">Applications to review</div>
          <p className="sch-queue-empty">
            No applications yet. New learner registrations appear here for
            manual document review.
          </p>
        </aside>
        <section className="sch-detail">
          <h1>Manual document review</h1>
          <p>
            Select an application from the queue to check the uploaded
            documents against the civil registry{' '}
            <span className="integration-badge sandbox">Sandbox</span> and
            confirm prior education records before the Ministry approves the
            enrolment.
          </p>
        </section>
      </div>
    </SchoolShell>
  );
}
