import { SchoolShell } from '@/components/SchoolShell';
import { getSession } from '@/lib/guards';

export default async function SchoolGraduation() {
  const session = await getSession();

  return (
    <SchoolShell active="graduation" userName={session?.user.name ?? 'Officer'}>
      <section className="sch-detail">
        <h1>Graduation decisions</h1>
        <p>
          Submit a signed graduation decision for an approved learner: the
          programme, qualification code, final result and the document hash of
          the decision. The Ministry validates it against the Education
          Service Registry{' '}
          <span className="integration-badge sandbox">Sandbox</span> before
          issuing the diploma.
        </p>
      </section>
    </SchoolShell>
  );
}
