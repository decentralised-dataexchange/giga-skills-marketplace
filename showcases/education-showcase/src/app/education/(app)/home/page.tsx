import Link from 'next/link';

import { getSession } from '@/lib/guards';
import {
  getApplicationForLearner,
  getLearnerByUserId,
  isExchangeAccepted,
} from '@/lib/registry';
import { ExchangeQr } from '@/components/ExchangeQr';
import { PaymentConfirm } from '@/components/PaymentConfirm';

const STATUS_TEXT: Record<string, string> = {
  submitted: 'Your application is with the school admissions office for manual document review.',
  school_validated: 'Documents validated. The Ministry registrar is reviewing your enrolment.',
  approved: 'Enrolment approved. Add your Student ID to your wallet below.',
  graduation_submitted: 'Your school submitted the graduation decision. The Ministry is validating it.',
  payment_pending: 'The diploma fee is due. Pay with your wallet, and your diploma is issued in the same step.',
  issued: 'Your diploma has been issued. Add it to your wallet below.',
};

export default async function EducationHome() {
  const session = await getSession();
  const learner = session ? getLearnerByUserId(session.user.id) : undefined;
  const app = learner ? getApplicationForLearner(learner.id) : undefined;
  const form = app ? (JSON.parse(app.form) as Record<string, unknown>) : {};

  return (
    <>
      <section className="edu-hero">
        <h1>Welcome, {learner?.displayName ?? 'Learner'}</h1>
        <p>
          {app
            ? STATUS_TEXT[app.status] ?? 'Your application is in progress.'
            : 'Start your learner registration. Your wallet has already confirmed your identity.'}
        </p>
        {!app ? (
          <Link className="edu-cta" href="/education/register">
            Start registration
          </Link>
        ) : null}
      </section>

      {learner?.ulid ? (
        <div className="edu-card">
          <h2>Your learner identifier</h2>
          <p>
            <code style={{ fontSize: '1.05rem' }}>{learner.ulid}</code>
          </p>
        </div>
      ) : null}

      {app && typeof form.studentIdOffer === 'string' ? (
        <div className="edu-card">
          <h2>
            Student ID{' '}
            <span className="integration-badge real">Verifiable credential</span>
          </h2>
          {isExchangeAccepted(String(form.studentIdExchangeId)) ? (
            <p style={{ color: 'var(--ok)', fontWeight: 600 }}>
              ✓ Your Student ID is in your wallet.
            </p>
          ) : (
            <>
              <p>
                Scan with your wallet to receive your selectively disclosable
                Student ID. The wallet will ask for the transaction code below.
              </p>
              <ExchangeQr
                exchangeId={String(form.studentIdExchangeId)}
                qrUri={form.studentIdOffer}
                logo="/portals/moe/logo.svg"
                waitingText="Waiting for your wallet to accept the Student ID…"
              />
              {typeof form.studentIdPin === 'string' ? (
                <p className="edu-pin">
                  Transaction code: <strong>{form.studentIdPin}</strong>
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {app?.status === 'payment_pending' ? (
        <div className="edu-card">
          <h2>
            Diploma fee{' '}
            <span className="integration-badge real">TS12 payment credential</span>
          </h2>
          <p>
            The Ministry requires payment before it issues your diploma. Pay
            from your account or by card: one scan pays the EUR 50 fee and
            delivers your diploma in the same step.
          </p>
          <PaymentConfirm
            initial={
              typeof form.diplomaOffer === 'string'
                ? {
                    exchangeId: String(form.diplomaExchangeId),
                    qrUri: form.diplomaOffer,
                  }
                : null
            }
          />
        </div>
      ) : null}

      {app && app.status === 'issued' && typeof form.diplomaOffer === 'string' ? (
        <div className="edu-card">
          <h2>
            Diploma{' '}
            <span className="integration-badge real">Verifiable credential</span>
          </h2>
          {isExchangeAccepted(String(form.diplomaExchangeId)) ? (
            <p style={{ color: 'var(--ok)', fontWeight: 600 }}>
              ✓ Your diploma is in your wallet
              {app.paymentLedgerRef ? ` (payment reference ${app.paymentLedgerRef})` : ''}.
              You can now share it with an employer, on your terms.
            </p>
          ) : (
            <>
              <p>
                Congratulations. Scan with your wallet to receive your diploma
                {app.paymentLedgerRef ? ` (payment reference ${app.paymentLedgerRef})` : ''}.
                The wallet will ask for the transaction code below.
              </p>
              <ExchangeQr
                exchangeId={String(form.diplomaExchangeId)}
                qrUri={form.diplomaOffer}
                logo="/portals/moe/logo.svg"
                waitingText="Waiting for your wallet to accept the diploma…"
              />
              {typeof form.diplomaPin === 'string' ? (
                <p className="edu-pin">
                  Transaction code: <strong>{form.diplomaPin}</strong>
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </>
  );
}
