import { MoeShell } from '@/components/MoeShell';
import { auditTimeline, verifyAuditChain } from '@/lib/audit';
import { getSession } from '@/lib/guards';

function DetailList({ payload }: { payload: string }) {
  let entries: [string, unknown][] = [];
  try {
    entries = Object.entries(JSON.parse(payload) as Record<string, unknown>);
  } catch {
    entries = [];
  }
  if (entries.length === 0) return <span className="moe-audit-empty">-</span>;
  return (
    <dl className="moe-audit-detail">
      {entries.map(([key, value]) => (
        <div key={key}>
          <dt>{key}</dt>
          <dd>
            {typeof value === 'string' ? value : JSON.stringify(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

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
          <table className="moe-audit">
            <thead>
              <tr>
                <th className="moe-audit-num">#</th>
                <th className="moe-audit-time">Time (UTC)</th>
                <th className="moe-audit-role">Actor</th>
                <th className="moe-audit-action">Action</th>
                <th className="moe-audit-subject">Subject</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => {
                const [date, time] = event.createdAt
                  .slice(0, 19)
                  .split('T');
                return (
                  <tr key={event.seq}>
                    <td className="moe-audit-num">{event.seq}</td>
                    <td className="moe-audit-time">
                      <span>{date}</span>
                      <small>{time}</small>
                    </td>
                    <td className="moe-audit-role">
                      <span className="moe-role-chip">
                        {event.actorRole.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="moe-audit-action">{event.action}</td>
                    <td className="moe-audit-subject">
                      <small>{event.subjectType}</small>
                      <code>{event.subjectId}</code>
                    </td>
                    <td>
                      <DetailList payload={event.payload} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </MoeShell>
  );
}
