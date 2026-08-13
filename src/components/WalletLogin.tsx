'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';

import { useExchangeStatus } from '@/components/useExchangeStatus';
import { startPidLogin } from '@/app/education/login/actions';

type Phase = 'starting' | 'waiting' | 'signing-in' | 'rejected' | 'error';

/**
 * The learner QR sign-in. Starts the OpenID4VP request, renders the QR,
 * listens for the verified event, then exchanges the one-time login token for
 * a session cookie on this device.
 */
export function WalletLogin() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('starting');
  const [exchangeId, setExchangeId] = useState<string | null>(null);
  const [qrUri, setQrUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    startPidLogin()
      .then((result) => {
        if (cancelled) return;
        setExchangeId(result.exchangeId);
        setQrUri(result.qrUri);
        setPhase('waiting');
      })
      .catch(() => {
        if (!cancelled) setPhase('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onEvent = useCallback(
    async (payload: Record<string, unknown>) => {
      if (payload.status === 'verified' && typeof payload.loginToken === 'string') {
        setPhase('signing-in');
        const answer = await fetch('/api/auth/wallet/sign-in', {
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
        Open the wallet on your phone and scan the code to present your person
        identification data (PID). We use it to confirm who you are; the
        registry keeps no copy of your identity attributes.
      </p>
      <div className="edu-qr-frame">
        {phase === 'starting' ? (
          <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
            Preparing your sign-in…
          </span>
        ) : null}
        {phase === 'waiting' && qrUri ? (
          <QRCodeSVG value={qrUri} size={216} marginSize={2} />
        ) : null}
        {phase === 'signing-in' ? (
          <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
            Presentation received. Signing you in…
          </span>
        ) : null}
        {phase === 'rejected' ? (
          <span style={{ color: 'var(--bad)', fontSize: '0.85rem' }}>
            The presentation could not be verified.
          </span>
        ) : null}
        {phase === 'error' ? (
          <span style={{ color: 'var(--bad)', fontSize: '0.85rem' }}>
            Something went wrong. Refresh the page to try again.
          </span>
        ) : null}
      </div>
      {phase === 'waiting' && qrUri ? (
        <p>
          On this phone?{' '}
          <a href={qrUri} style={{ color: 'var(--brand)' }}>
            Open your wallet directly
          </a>
          .
        </p>
      ) : null}
      <span className="integration-badge real">Real wallet flow</span>
    </div>
  );
}
