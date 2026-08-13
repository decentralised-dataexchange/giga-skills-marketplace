import { MoeShell } from '@/components/MoeShell';
import { getSession } from '@/lib/guards';

export default async function MoeApprovals() {
  const session = await getSession();

  return (
    <MoeShell
      active="approvals"
      userName={session?.user.name ?? 'Registrar'}
      breadcrumb="Enrolment approvals"
    >
      <h1>Enrolment approvals</h1>
      <p className="moe-page-intro">
        Applications validated by the school arrive here for the final
        registrar decision. Approval generates the Unique Learner Identifier,
        creates the authoritative learner profile in the National Learner
        Registry and issues the Verifiable Student ID to the learner&apos;s
        wallet.
      </p>
      <div className="moe-panel">
        <h2>Awaiting decision</h2>
        <p className="moe-empty">No applications are awaiting a decision.</p>
      </div>
    </MoeShell>
  );
}
