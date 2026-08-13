'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';

import { WalletInvite } from '@/components/WalletInvite';
import { useExchangeStatus } from '@/components/useExchangeStatus';

const SCANNED_TOPICS = [
  'openid.credential.offer_received',
  'openid.credential.token_issued',
];

const DONE_TOPICS = [
  'openid.credential.credential_accepted',
  'openid.credential.credential_acked',
  'digitalwallet.presentation.verified',
  'openid.presentation.presentation_acked.v3',
];

/**
 * A wallet interaction with live status: renders the invite (QR or deep
 * link), listens on the exchange over SSE with polling fallback, switches
 * to a "scanned" state as soon as the wallet picks the offer up (the
 * demonstrators' pattern), and refreshes the page on the terminal event.
 */
export function ExchangeQr({
  exchangeId,
  qrUri,
  waitingText,
  logo,
  doneTopics = DONE_TOPICS,
}: {
  exchangeId: string;
  qrUri: string;
  waitingText: string;
  logo?: string;
  doneTopics?: string[];
}) {
  const router = useRouter();
  const [state, setState] = useState<'waiting' | 'scanned' | 'done'>('waiting');

  const onEvent = useCallback(
    (payload: Record<string, unknown>) => {
      const topic = typeof payload.topic === 'string' ? payload.topic : '';
      if (
        doneTopics.includes(topic) ||
        payload.status === 'paid' ||
        payload.status === 'verified'
      ) {
        setState('done');
        router.refresh();
        return;
      }
      if (SCANNED_TOPICS.includes(topic)) {
        setState('scanned');
      }
    },
    [doneTopics, router]
  );

  useExchangeStatus(state === 'done' ? null : exchangeId, onEvent);

  if (state !== 'waiting') {
    return (
      <div className="qr-wrap">
        <div className="spinner" aria-hidden />
        <p className="qr-hint">
          {state === 'done'
            ? 'Done. Updating…'
            : 'Scanned. Continue in the wallet on your phone…'}
        </p>
      </div>
    );
  }

  return <WalletInvite uri={qrUri} logo={logo} hint={waitingText} />;
}
