import { MoeShell } from '@/components/MoeShell';
import { getSession } from '@/lib/guards';

export default async function MoeIssuance() {
  const session = await getSession();

  return (
    <MoeShell
      active="issuance"
      userName={session?.user.name ?? 'Registrar'}
      breadcrumb="Diploma issuance"
    >
      <h1>Diploma issuance</h1>
      <p className="moe-page-intro">
        Graduation decisions submitted by institutions are validated against
        the Education Service Registry{' '}
        <span className="integration-badge sandbox">Sandbox</span> and, when
        policy requires it, held until payment is confirmed. Issued diplomas
        are revocable credentials{' '}
        <span className="integration-badge real">Real</span>.
      </p>
      <div className="moe-panel">
        <h2>Pending issuance</h2>
        <p className="moe-empty">No graduation decisions are pending.</p>
      </div>
    </MoeShell>
  );
}
