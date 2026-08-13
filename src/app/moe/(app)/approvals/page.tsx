import { MoeShell } from '@/components/MoeShell';
import { getSession } from '@/lib/guards';
import { listApplications } from '@/lib/registry';

import { approveEnrolment } from './actions';

export default async function MoeApprovals() {
  const session = await getSession();
  const pending = listApplications(['school_validated']);
  const decided = listApplications(['approved', 'graduation_submitted', 'payment_pending', 'issued']);

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
        wallet <span className="integration-badge real">Real issuance</span>.
      </p>
      <div className="moe-panel">
        <h2>Awaiting decision</h2>
        {pending.length === 0 ? (
          <p className="moe-empty">No applications are awaiting a decision.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Learner</th>
                <th>Institution</th>
                <th>Validated</th>
                <th>Decision</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((app) => (
                <tr key={app.id}>
                  <td>{app.learnerName}</td>
                  <td>{app.institutionName}</td>
                  <td>{app.updatedAt.slice(0, 10)}</td>
                  <td>
                    <form action={approveEnrolment}>
                      <input type="hidden" name="applicationId" value={app.id} />
                      <button className="moe-action" type="submit">
                        Approve and issue Student ID
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {decided.length > 0 ? (
        <div className="moe-panel">
          <h2>Decided</h2>
          <table>
            <thead>
              <tr>
                <th>Learner</th>
                <th>Status</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {decided.map((app) => (
                <tr key={app.id}>
                  <td>{app.learnerName}</td>
                  <td>{app.status.replace(/_/g, ' ')}</td>
                  <td>{app.updatedAt.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </MoeShell>
  );
}
