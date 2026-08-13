import { DpaShell } from '@/components/DpaShell';
import { getSession } from '@/lib/guards';

export default async function DpaRecords() {
  const session = await getSession();

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
        Consent records shown here come from the live Consent Building Block{' '}
        <span className="integration-badge real">Real</span>. The erasure
        procedure below is the only place in the showcase that can remove a
        learner&apos;s consent history.
      </p>

      <h2>Consent records</h2>
      <p>No learner has been onboarded yet. Records appear once a learner completes registration.</p>

      <h2>Erasure requests</h2>
      <p>
        The right-to-be-forgotten procedure (delete all consent records for an
        individual) becomes available here once records exist.
      </p>
    </DpaShell>
  );
}
