import { MoeShell } from '@/components/MoeShell';
import { getSession } from '@/lib/guards';
import { PAYMENT_REQUIRED_KEY, getPolicy } from '@/lib/policy';

import { togglePaymentRequired } from './actions';

export default async function MoePolicy() {
  const session = await getSession();
  const paymentRequired = getPolicy(PAYMENT_REQUIRED_KEY, 'false') === 'true';

  return (
    <MoeShell
      active="policy"
      userName={session?.user.name ?? 'Registrar'}
      breadcrumb="Policy settings"
    >
      <h1>Policy settings</h1>
      <p className="moe-page-intro">
        Business rules for the credential workflows. Every change is recorded
        in the audit timeline with the officer who made it. In a production
        deployment these rules come from the low-code configuration service;
        the showcase manages them here.
      </p>
      <div className="moe-panel">
        <h2>Diploma issuance</h2>
        <div className="moe-policy-row">
          <div>
            <div className="moe-policy-name">
              Payment confirmation required for diploma issuance
            </div>
            <p className="moe-policy-desc">
              When on, a diploma is not issued until the learner confirms
              payment by presenting a payment account credential (TS12) from
              their wallet. The funds movement itself is a simulated ledger
              entry.
            </p>
          </div>
          <span className="moe-policy-state" data-on={paymentRequired}>
            {paymentRequired ? 'ON' : 'OFF'}
          </span>
          <form action={togglePaymentRequired}>
            <button className="moe-action" type="submit">
              Turn {paymentRequired ? 'off' : 'on'}
            </button>
          </form>
        </div>
      </div>
    </MoeShell>
  );
}
