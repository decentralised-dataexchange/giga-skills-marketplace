'use client';

import { useState } from 'react';

import { ExchangeQr } from '@/components/ExchangeQr';
import { startPayment } from '@/app/education/(app)/home/payment-actions';

/**
 * The diploma-fee confirmation: the learner presents the TS12 Payment
 * Account Credential from the wallet. The verified presentation is the
 * payment evidence; issuance follows automatically.
 */
export function PaymentConfirm() {
  const [request, setRequest] = useState<{ exchangeId: string; qrUri: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function begin() {
    setBusy(true);
    setError(null);
    try {
      setRequest(await startPayment());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong.');
    } finally {
      setBusy(false);
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
      <button className="edu-cta" type="button" onClick={begin} disabled={busy}>
        {busy ? 'Preparing…' : 'Confirm payment with your wallet'}
      </button>
      {error ? <p className="login-error">{error}</p> : null}
    </div>
  );
}
