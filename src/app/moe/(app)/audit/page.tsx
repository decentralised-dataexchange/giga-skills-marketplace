import { MoeShell } from '@/components/MoeShell';
import { auditTimeline, verifyAuditChain } from '@/lib/audit';
import { getSession } from '@/lib/guards';

export default async function MoeAudit() {
  const session = await getSession();
  const events = auditTimeline(100);
  const broken = verifyAuditChain();

  return (
    <MoeShell
      active="audit"
      userName={session?.user.name ?? 'Registrar'}
      breadcrumb="Audit timeline"
    >
      <h1>Audit timeline</h1>
      <p className="moe-page-intro">
        The append-only record of every consequential action: policy changes,
        approvals, issuance, verification and revocation. Rows are chained
        with SHA-256 hashes; the chain is{' '}
        {broken === null ? (
          <strong style={{ color: 'var(--ok)' }}>intact</strong>
        ) : (
          <strong style={{ color: 'var(--bad)' }}>broken at #{broken}</strong>
        )}
        .
      </p>
      <div className="moe-panel">
        {events.length === 0 ? (
          <p className="moe-empty">No audit events yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Time (UTC)</th>
                <th>Actor role</th>
                <th>Action</th>
                <th>Subject</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.seq}>
                  <td>{event.seq}</td>
                  <td>{event.createdAt.replace('T', ' ').slice(0, 19)}</td>
                  <td>{event.actorRole}</td>
                  <td>{event.action}</td>
                  <td>
                    {event.subjectType}: {event.subjectId}
                  </td>
                  <td>
                    <code style={{ fontSize: '0.72rem' }}>{event.payload}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </MoeShell>
  );
}
