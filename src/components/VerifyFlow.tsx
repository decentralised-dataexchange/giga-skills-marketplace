'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WalletInvite } from '@/components/WalletInvite';
import { useExchangeStatus } from '@/components/useExchangeStatus';
import { startDiplomaVerification } from '@/app/civicworks/(app)/verify/actions';

/**
 * The employer verification flow: request → QR → navigate to the
 * server-rendered result when the presentation lands.
 */
export function VerifyFlow() {
  const router = useRouter();
  const [request, setRequest] = useState<{ exchangeId: string; qrUri: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const begin = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      setRequest(await startDiplomaVerification());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }, []);

  const onEvent = useCallback(
    (payload: Record<string, unknown>) => {
      const topic = typeof payload.topic === 'string' ? payload.topic : '';
      if (
        topic === 'digitalwallet.presentation.verified' ||
        topic === 'openid.presentation.presentation_acked.v3'
      ) {
        router.push(`/civicworks/verify?ex=${request?.exchangeId}`);
        router.refresh();
      }
    },
    [router, request]
  );

  useExchangeStatus(request?.exchangeId ?? null, onEvent);

  if (!request) {
    return (
      <div>
        <button className="cw-pill" type="button" onClick={begin} disabled={busy}>
          {busy ? 'Preparing request…' : 'Start a verification'}
        </button>
        {error ? <p className="login-error">{error}</p> : null}
      </div>
    );
  }

  return (
    <WalletInvite
      uri={request.qrUri}
      logo="/portals/civicworks/logo.svg"
      hint="Ask the candidate to scan this code and approve sharing the five requested fields."
      onRefresh={begin}
    />
  );
}
