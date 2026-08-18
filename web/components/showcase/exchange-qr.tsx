"use client";

import { useCallback, useState } from "react";

import { WalletInvite } from "@/components/showcase/wallet-invite";
import { useExchangeStatus } from "@/components/showcase/use-exchange-status";
import { recordExchangeTopic } from "@/lib/showcase/registry";

const SCANNED_TOPICS = ["openid.credential.offer_received", "openid.credential.token_issued"];

const DONE_TOPICS = [
  "openid.credential.credential_accepted",
  "openid.credential.credential_acked",
  "digitalwallet.presentation.verified",
  "openid.presentation.presentation_acked.v3",
];

/**
 * A wallet interaction with live status: renders the invite (QR or deep
 * link), polls the exchange's relay for webhook events, switches
 * to a "scanned" state as soon as the wallet picks the offer up (the
 * demonstrators' pattern), and records every topic in the browser store on
 * arrival - the store update re-renders whatever shows the outcome.
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
  // Every ExchangeQr use is a Ministry-sandbox issuance (Student ID,
  // diploma); presentations poll through their own components.
  const [state, setState] = useState<"waiting" | "scanned" | "done">("waiting");

  const onEvent = useCallback(
    (payload: Record<string, unknown>) => {
      const topic = typeof payload.topic === "string" ? payload.topic : "";
      if (topic) recordExchangeTopic(exchangeId, topic);
      if (doneTopics.includes(topic)) {
        setState("done");
        return;
      }
      if (SCANNED_TOPICS.includes(topic)) {
        setState("scanned");
      }
    },
    [doneTopics, exchangeId],
  );

  useExchangeStatus(state === "done" ? null : exchangeId, "moe", "issuance", onEvent);

  if (state !== "waiting") {
    return (
      <div className="qr-wrap">
        <div className="spinner" aria-hidden />
        <p className="qr-hint">
          {state === "done" ? "Done. Updating…" : "Scanned. Continue in the wallet on your phone…"}
        </p>
      </div>
    );
  }

  return <WalletInvite uri={qrUri} logo={logo} hint={waitingText} />;
}
