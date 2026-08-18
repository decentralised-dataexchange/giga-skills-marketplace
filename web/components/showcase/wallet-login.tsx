"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { WalletInvite } from "@/components/showcase/wallet-invite";
import { useExchangeStatus } from "@/components/showcase/use-exchange-status";
import { audit } from "@/lib/showcase/audit";
import { getState, store } from "@/lib/showcase/store";
import { completePidLogin, startPidLogin } from "@/app/showcase/education/login/actions";

type Phase = "starting" | "waiting" | "signing-in" | "rejected" | "error";

const PRESENTATION_DONE_TOPICS = [
  "digitalwallet.presentation.verified",
  "openid.presentation.presentation_acked.v3",
];

/**
 * The learner sign-in. Starts the OpenID4VP request, hands the invite to the
 * wallet (QR on desktop, deep link on the phone), and listens for the
 * finished presentation. Completion is a broker call that checks the OWS
 * verification record and returns the pairwise identity; the session it
 * yields is fake, stored in this browser's localStorage only.
 */
export function WalletLogin() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("starting");
  const [exchangeId, setExchangeId] = useState<string | null>(null);
  const [qrUri, setQrUri] = useState<string | null>(null);

  const begin = useCallback(async () => {
    try {
      const result = await startPidLogin();
      setExchangeId(result.exchangeId);
      setQrUri(result.qrUri);
      setPhase("waiting");
    } catch {
      setPhase("error");
    }
  }, []);

  // The initial state is already "starting", so the mount effect only fires
  // the request; every setState in begin() happens after the await.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async: state settles only after the broker answers
    void begin();
  }, [begin]);

  const start = useCallback(() => {
    setPhase("starting");
    setQrUri(null);
    void begin();
  }, [begin]);

  const onEvent = useCallback(
    async (payload: Record<string, unknown>) => {
      const topic = typeof payload.topic === "string" ? payload.topic : "";
      if (!PRESENTATION_DONE_TOPICS.includes(topic) || !exchangeId) return;

      setPhase("signing-in");
      try {
        const result = await completePidLogin(exchangeId);
        if (!result) {
          setPhase("rejected");
          return;
        }

        const now = new Date().toISOString();
        const existing = getState().learner;
        if (existing && existing.pseudonym === result.pseudonym) {
          // A returning learner refreshes the transient prefill.
          store.setLearner({
            ...existing,
            displayName: result.displayName,
            prefill: result.prefill,
          });
        } else {
          store.setLearner({
            pseudonym: result.pseudonym,
            displayName: result.displayName,
            prefill: result.prefill,
            ulid: null,
            individualId: null,
            createdAt: now,
          });
          await audit({
            actorPseudonym: result.pseudonym,
            actorRole: "learner",
            action: "learner.identified",
            subjectType: "learner",
            subjectId: "redacted",
            payload: { presentationExchangeId: exchangeId },
          });
        }
        store.setLearnerSession({
          pseudonym: result.pseudonym,
          displayName: result.displayName,
          signedInAt: now,
        });
        router.push("/showcase/education/home");
      } catch {
        setPhase("error");
      }
    },
    [exchangeId, router],
  );

  useExchangeStatus(phase === "waiting" ? exchangeId : null, "moe", "presentation", onEvent);

  return (
    <div className="edu-card">
      <h1>Sign in with your wallet</h1>
      <p>
        Present your person identification data (PID) from the wallet on your phone. We use it to
        confirm who you are.
      </p>
      <div style={{ margin: "1.5rem 0 1rem" }}>
        {phase === "starting" ? <p className="qr-hint">Preparing your sign-in…</p> : null}
        {phase === "waiting" && qrUri ? (
          <WalletInvite
            uri={qrUri}
            logo="/showcase/portals/education/logo.svg"
            hint="Scan this with the Wallet on your phone and share your PID."
            onRefresh={start}
          />
        ) : null}
        {phase === "signing-in" ? (
          <p className="qr-hint">Presentation received. Signing you in…</p>
        ) : null}
        {phase === "rejected" ? (
          <p className="qr-hint" style={{ color: "var(--bad)", opacity: 1 }}>
            The presentation could not be verified.
          </p>
        ) : null}
        {phase === "error" ? (
          <p className="qr-hint" style={{ color: "var(--bad)", opacity: 1 }}>
            Something went wrong.{" "}
            <button
              type="button"
              className="qr-refresh"
              onClick={start}
              style={{ display: "inline" }}
            >
              Try again
            </button>
          </p>
        ) : null}
      </div>
    </div>
  );
}
