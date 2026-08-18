"use client";

import { useState } from "react";
import { CreditCard, Landmark } from "lucide-react";

import { ExchangeQr } from "@/components/showcase/exchange-qr";
import { attachDiplomaOffer } from "@/lib/showcase/registry";
import { useShowcaseStore } from "@/lib/showcase/use-store";
import type { Application } from "@/lib/showcase/store";
import { startPayment } from "@/app/showcase/education/(app)/home/payment-actions";

/**
 * The diploma-fee payment as a dynamic credential request: the learner
 * chooses account or card, scans once, presents the chosen TS12 payment
 * credential with the transaction data, and the wallet receives the diploma
 * in the same session. The method is switchable until the payment is made:
 * choosing again simply starts a fresh request. A pending request persists
 * in the store, so a refresh resumes it.
 */
export function PaymentConfirm({ app }: { app: Application }) {
  const { learner } = useShowcaseStore();
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState<"account" | "card" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const request =
    !dismissed && app.form.diplomaOffer && app.form.diplomaExchangeId
      ? { exchangeId: app.form.diplomaExchangeId, qrUri: app.form.diplomaOffer }
      : null;

  async function begin(method: "account" | "card") {
    setBusy(method);
    setError(null);
    try {
      const offer = await startPayment(
        {
          applicationId: app.id,
          learnerName: app.learnerName,
          programme: app.programme ?? "",
          qualificationCode: app.qualificationCode ?? "",
          result: app.result ?? "",
          awardingInstitution: app.institutionName,
          ulid: learner?.ulid ?? "",
          graduationDecisionHash: app.graduationDocHash ?? "",
        },
        method,
      );
      attachDiplomaOffer(app.id, { ...offer, method });
      setDismissed(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  if (request) {
    return (
      <div>
        <ExchangeQr
          exchangeId={request.exchangeId}
          qrUri={request.qrUri}
          logo="/showcase/portals/moe/logo.svg"
          waitingText="Scan with your wallet: approve the EUR 50 payment and receive your diploma."
        />
        <p style={{ textAlign: "center", marginTop: "0.5rem" }}>
          <button type="button" className="qr-refresh" onClick={() => setDismissed(true)}>
            Pay another way
          </button>
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="edu-pay-methods">
        <button
          className="edu-cta"
          type="button"
          onClick={() => begin("account")}
          disabled={busy !== null}
        >
          <Landmark size={17} />
          {busy === "account" ? "Preparing…" : "Pay from account"}
        </button>
        <button
          className="edu-cta"
          type="button"
          onClick={() => begin("card")}
          disabled={busy !== null}
        >
          <CreditCard size={17} />
          {busy === "card" ? "Preparing…" : "Pay by card"}
        </button>
      </div>
      {error ? <p className="login-error">{error}</p> : null}
    </div>
  );
}
