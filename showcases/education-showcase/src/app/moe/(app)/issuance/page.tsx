import { MoeShell } from '@/components/MoeShell';
import { getSession } from '@/lib/guards';
import { getDiplomaExchange, listApplications } from '@/lib/registry';

import { processGraduation, revokeIssuedDiploma } from './actions';

export default async function MoeIssuance() {
  const session = await getSession();
  const pending = listApplications(['graduation_submitted']);
  const awaitingPayment = listApplications(['payment_pending']);
  const issued = listApplications(['issued']);

  return (
    <MoeShell
      active="issuance"
      userName={session?.user.name ?? 'Registrar'}
      breadcrumb="Diploma issuance"
    >
      <h1>Diploma issuance</h1>
      <p className="moe-page-intro">
        Graduation decisions are validated against the Education Service
        Registry <span className="integration-badge sandbox">Sandbox</span>.
        The diploma fee is always due: the learner pays with the wallet and
        receives the diploma in the same step. Issued diplomas are revocable
        credentials <span className="integration-badge real">Real</span>.
      </p>

      <div className="moe-panel">
        <h2>Pending validation</h2>
        {pending.length === 0 ? (
          <p className="moe-empty">No graduation decisions are pending.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Learner</th>
                <th>Programme</th>
                <th>Code</th>
                <th>Decision hash</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((app) => (
                <tr key={app.id}>
                  <td>{app.learnerName}</td>
                  <td>{app.programme}</td>
                  <td>{app.qualificationCode}</td>
                  <td>
                    <code style={{ fontSize: '0.7rem' }}>
                      {app.graduationDocHash?.slice(0, 16)}…
                    </code>
                  </td>
                  <td>
                    <form action={processGraduation}>
                      <input type="hidden" name="applicationId" value={app.id} />
                      <button className="moe-action" type="submit">
                        Validate and require payment
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {awaitingPayment.length > 0 ? (
        <div className="moe-panel">
          <h2>Awaiting payment confirmation</h2>
          <table>
            <thead>
              <tr>
                <th>Learner</th>
                <th>Programme</th>
                <th>State</th>
              </tr>
            </thead>
            <tbody>
              {awaitingPayment.map((app) => (
                <tr key={app.id}>
                  <td>{app.learnerName}</td>
                  <td>{app.programme}</td>
                  <td>
                    Blocked until the learner presents the TS12 payment
                    credential. Issuance follows automatically.
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {issued.length > 0 ? (
        <div className="moe-panel">
          <h2>Issued</h2>
          <table>
            <thead>
              <tr>
                <th>Learner</th>
                <th>Programme</th>
                <th>Payment</th>
                <th>Issued</th>
                <th>Revocation</th>
              </tr>
            </thead>
            <tbody>
              {issued.map((app) => {
                const exchange = getDiplomaExchange(app.id);
                return (
                  <tr key={app.id}>
                    <td>{app.learnerName}</td>
                    <td>{app.programme}</td>
                    <td>{app.paymentLedgerRef ?? 'not required'}</td>
                    <td>{app.updatedAt.slice(0, 10)}</td>
                    <td>
                      {exchange?.revoked ? (
                        <span style={{ color: 'var(--bad)', fontWeight: 700 }}>
                          Revoked {exchange.revokedAt?.slice(0, 10)}
                        </span>
                      ) : exchange ? (
                        <form action={revokeIssuedDiploma}>
                          <input type="hidden" name="applicationId" value={app.id} />
                          <button className="moe-action" data-variant="danger" type="submit">
                            Revoke permanently
                          </button>
                        </form>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </MoeShell>
  );
}
