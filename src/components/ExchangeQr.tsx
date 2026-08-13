'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';

import { useExchangeStatus } from '@/components/useExchangeStatus';

/**
 * A wallet interaction QR: renders the URI, listens on the exchange over
 * SSE (with polling fallback), and refreshes the page when a terminal
 * event arrives, so the server-rendered status moves forward.
 */
export function ExchangeQr({
  exchangeId,
  qrUri,
  waitingText,
  doneTopics = [
    'openid.credential.credential_accepted',
    'openid.credential.credential_acked',
    'digitalwallet.presentation.verified',
    'openid.presentation.presentation_acked.v3',
  ],
  size = 200,
}: {
  exchangeId: string;
  qrUri: string;
  waitingText: string;
  doneTopics?: string[];
  size?: number;
}) {
  const router = useRouter();
  const [done, setDone] = useState(false);

  const onEvent = useCallback(
    (payload: Record<string, unknown>) => {
      const topic = typeof payload.topic === 'string' ? payload.topic : '';
      if (
        doneTopics.includes(topic) ||
        payload.status === 'paid' ||
        payload.status === 'verified'
      ) {
        setDone(true);
        router.refresh();
      }
    },
    [doneTopics, router]
  );

  useExchangeStatus(done ? null : exchangeId, onEvent);

  return (
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          display: 'inline-block',
          background: '#ffffff',
          padding: '0.75rem',
          borderRadius: 8,
          border: '1px solid rgba(0,0,0,0.12)',
        }}
      >
        <QRCodeSVG value={qrUri} size={size} marginSize={1} />
      </div>
      <p style={{ marginTop: '0.6rem', fontSize: '0.85rem', opacity: 0.75 }}>
        {done ? 'Done. Updating…' : waitingText}
      </p>
      <p style={{ fontSize: '0.8rem' }}>
        On this phone? <a href={qrUri}>Open your wallet directly</a>.
      </p>
    </div>
  );
}
