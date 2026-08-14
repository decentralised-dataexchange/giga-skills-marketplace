'use client';

import { useState } from 'react';
import { CreditCard, Landmark } from 'lucide-react';

import { ExchangeQr } from '@/components/ExchangeQr';
import { startPayment } from '@/app/education/(app)/home/payment-actions';

/**
 * The diploma-fee payment as a dynamic credential request: the learner
 * chooses account or card, scans once, presents the chosen TS12 payment
 * credential with the transaction data, and the wallet receives the diploma
 * in the same session.
 */
export function PaymentConfirm() {
  const [request, setRequest] = useState<{ exchangeId: string; qrUri: string } | null>(null);
  const [busy, setBusy] = useState<'account' | 'card' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function begin(method: 'account' | 'card') {
    setBusy(method);
    setError(null);
    try {
      setRequest(await startPayment(method));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong.');
    } finally {
      setBusy(null);
    }
  }

  if (request) {
    return (
      <ExchangeQr
        exchangeId={request.exchangeId}
        qrUri={request.qrUri}
        logo="/portals/moe/logo.svg"
        waitingText="Scan with your wallet: approve the EUR 50 payment and receive your diploma."
      />
    );
  }

  return (
    <div>
      <div className="edu-pay-methods">
        <button
          className="edu-cta"
          type="button"
          onClick={() => begin('account')}
          disabled={busy !== null}
        >
          <Landmark size={17} />
          {busy === 'account' ? 'Preparing…' : 'Pay from account'}
        </button>
        <button
          className="edu-cta"
          type="button"
          onClick={() => begin('card')}
          disabled={busy !== null}
        >
          <CreditCard size={17} />
          {busy === 'card' ? 'Preparing…' : 'Pay by card'}
        </button>
      </div>
      {error ? <p className="login-error">{error}</p> : null}
    </div>
  );
}
