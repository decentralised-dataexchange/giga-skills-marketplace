"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { ExchangeQr } from "@/components/showcase/exchange-qr";
import { PaymentConfirm } from "@/components/showcase/payment-confirm";
import { PortalLink } from "@/components/showcase/portal-link";
import { isExchangeAccepted, latestApplication } from "@/lib/showcase/store";
import { useShowcaseStore } from "@/lib/showcase/use-store";

const STATUS_TEXT: Record<string, ReactNode> = {
  submitted: (
    <>
      Your application is with the{" "}
      <PortalLink to="school">school admissions office</PortalLink> for document review. Once
      validated, you are enrolled automatically.
    </>
  ),
  approved: "You are enrolled. Add your Student ID to your wallet below.",
  payment_pending:
    "The diploma fee is due. Pay with your wallet, and your diploma is issued in the same step.",
  issued: "Your diploma has been issued. Add it to your wallet below.",
};

export default function EducationHome() {
  const state = useShowcaseStore();
  const learner = state.learner;
  const app = latestApplication(state);
  const form = app?.form;

  return (
    <>
      <section className="edu-hero">
        <h1>Welcome, {learner?.displayName ?? "Learner"}</h1>
        <p>
          {app
            ? (STATUS_TEXT[app.status] ?? "Your application is in progress.")
            : "Start your learner registration. Your wallet has already confirmed your identity."}
        </p>
        {!app ? (
          <Link className="edu-cta hint-pulse" href="/showcase/education/register">
            Start registration
          </Link>
        ) : null}
      </section>

      {learner?.ulid ? (
        <div className="edu-card">
          <h2>Your learner identifier</h2>
          <p>
            <code style={{ fontSize: "1.05rem" }}>{learner.ulid}</code>
          </p>
        </div>
      ) : null}

      {app && form?.studentIdOffer && form.studentIdExchangeId ? (
        <div className="edu-card">
          <h2>Student ID</h2>
          {isExchangeAccepted(state, form.studentIdExchangeId) ? (
            <p style={{ color: "var(--ok)", fontWeight: 600 }}>
              ✓ Your Student ID is in your wallet.
            </p>
          ) : (
            <>
              <p>
                Scan with your wallet to receive your selectively disclosable Student ID. The wallet
                will ask for the transaction code below.
              </p>
              <ExchangeQr
                exchangeId={form.studentIdExchangeId}
                qrUri={form.studentIdOffer}
                logo="/showcase/portals/moe/logo.svg"
                waitingText="Waiting for your wallet to accept the Student ID…"
              />
              {form.studentIdPin ? (
                <p className="edu-pin">
                  Transaction code: <strong>{form.studentIdPin}</strong>
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {app?.status === "payment_pending" ? (
        <div className="edu-card">
          <h2>Diploma fee</h2>
          <p>
            The Ministry requires payment before it issues your diploma. Pay from your account or by
            card: one scan pays the EUR 50 fee and delivers your diploma in the same step.
          </p>
          <PaymentConfirm app={app} />
        </div>
      ) : null}

      {app && app.status === "issued" && form?.diplomaOffer && form.diplomaExchangeId ? (
        <div className="edu-card">
          <h2>Diploma</h2>
          {isExchangeAccepted(state, form.diplomaExchangeId) ? (
            <p style={{ color: "var(--ok)", fontWeight: 600 }}>
              ✓ Your diploma is in your wallet
              {app.paymentLedgerRef ? ` (payment reference ${app.paymentLedgerRef})` : ""}. You can
              now share it with an employer, on your terms.
            </p>
          ) : (
            <>
              <p>
                Congratulations. Scan with your wallet to receive your diploma
                {app.paymentLedgerRef ? ` (payment reference ${app.paymentLedgerRef})` : ""}.
              </p>
              <ExchangeQr
                exchangeId={form.diplomaExchangeId}
                qrUri={form.diplomaOffer}
                logo="/showcase/portals/moe/logo.svg"
                waitingText="Waiting for your wallet to accept the diploma…"
              />
            </>
          )}
        </div>
      ) : null}
    </>
  );
}
