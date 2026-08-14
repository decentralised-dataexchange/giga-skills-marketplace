'use client';

import { useState } from 'react';
import { CreditCard, Landmark } from 'lucide-react';

import { ExchangeQr } from '@/components/ExchangeQr';
import { startPayment } from '@/app/education/(app)/home/payment-actions';

/**
 * The diploma-fee confirmation: the learner chooses to pay from their
 * account (TS12 Payment Account Credential) or by card (TS12 Payment Card
 * Credential), then presents the chosen credential from the wallet.
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
        waitingText="Scan with your wallet and approve the payment of EUR 50 to the Ministry of Education."
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
