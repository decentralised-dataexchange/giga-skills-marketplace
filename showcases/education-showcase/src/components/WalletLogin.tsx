'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { WalletInvite } from '@/components/WalletInvite';
import { useExchangeStatus } from '@/components/useExchangeStatus';
import { apiPath } from '@/lib/base-path';
import { startPidLogin } from '@/app/education/login/actions';

type Phase = 'starting' | 'waiting' | 'signing-in' | 'rejected' | 'error';

/**
 * The learner sign-in. Starts the OpenID4VP request, hands the invite to the
 * wallet (QR on desktop, deep link on the phone), listens for the verified
 * event, then exchanges the one-time login token for a session cookie.
 */
export function WalletLogin() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('starting');
  const [exchangeId, setExchangeId] = useState<string | null>(null);
  const [qrUri, setQrUri] = useState<string | null>(null);

  const start = useCallback(() => {
    setPhase('starting');
    setQrUri(null);
    startPidLogin()
      .then((result) => {
        setExchangeId(result.exchangeId);
        setQrUri(result.qrUri);
        setPhase('waiting');
      })
      .catch(() => setPhase('error'));
  }, []);

  useEffect(() => {
    start();
  }, [start]);

  const onEvent = useCallback(
    async (payload: Record<string, unknown>) => {
      if (payload.status === 'verified' && typeof payload.loginToken === 'string') {
        setPhase('signing-in');
        const answer = await fetch(apiPath('/api/auth/wallet/sign-in'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: payload.loginToken }),
        });
        if (answer.ok) {
          router.push('/education/home');
          router.refresh();
        } else {
          setPhase('error');
        }
      } else if (payload.status === 'rejected') {
        setPhase('rejected');
      } else if (payload.status === 'error') {
        setPhase('error');
      }
    },
    [router]
  );

  useExchangeStatus(phase === 'waiting' ? exchangeId : null, onEvent);

  return (
    <div className="edu-card">
      <h1>Sign in with your wallet</h1>
      <p>
        Present your person identification data (PID) from the wallet on your
        phone. We use it to confirm who you are.
      </p>
      <div style={{ margin: '1.5rem 0 1rem' }}>
        {phase === 'starting' ? <p className="qr-hint">Preparing your sign-in…</p> : null}
        {phase === 'waiting' && qrUri ? (
          <WalletInvite
            uri={qrUri}
            logo="/portals/education/logo.svg"
            hint="Scan this with the EUDI Wallet on your phone and share your PID."
            onRefresh={start}
          />
        ) : null}
        {phase === 'signing-in' ? (
          <p className="qr-hint">Presentation received. Signing you in…</p>
        ) : null}
        {phase === 'rejected' ? (
          <p className="qr-hint" style={{ color: 'var(--bad)', opacity: 1 }}>
            The presentation could not be verified.
          </p>
        ) : null}
        {phase === 'error' ? (
          <p className="qr-hint" style={{ color: 'var(--bad)', opacity: 1 }}>
            Something went wrong.{' '}
            <button
              type="button"
              className="qr-refresh"
              onClick={start}
              style={{ display: 'inline' }}
            >
              Try again
            </button>
          </p>
        ) : null}
      </div>
    </div>
  );
}
