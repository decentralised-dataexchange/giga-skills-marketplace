"use client";

import { useState } from "react";

import { SchoolShell } from "@/components/showcase/school-shell";
import { markDiplomaRevoked, submitGraduation } from "@/lib/showcase/registry";
import { getDiplomaExchange } from "@/lib/showcase/store";
import { useShowcaseStore } from "@/lib/showcase/use-store";

import { revokeIssuedDiploma } from "./actions";

/**
 * Graduation decisions: the school signs a decision (the sandbox TSP stands
 * in for a qualified signature), and the decision text is hashed; the hash
 * is referenced inside the diploma credential. Submission is processed by
 * the registry automatically: the institution is checked against the
 * Education Service Registry and the diploma fee falls due for the learner.
 * Revocation of an issued diploma is also requested here and processed
 * immediately.
 */
export default function SchoolGraduation() {
  const state = useShowcaseStore();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ready = state.applications.filter((app) => app.status === "approved");
  const sent = state.applications.filter(
    (app) => app.status === "payment_pending" || app.status === "issued",
  );

  async function submitDecision(appId: string, event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(appId);
    setError(null);
    const data = new FormData(event.currentTarget);
    try {
      await submitGraduation(appId, {
        programme: String(data.get("programme") ?? ""),
        qualificationCode: String(data.get("qualificationCode") ?? ""),
        result: String(data.get("result") ?? ""),
        decisionText: String(data.get("decisionText") ?? ""),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  async function revoke(appId: string, owsExchangeId: string) {
    if (busy) return;
    setBusy(appId);
    setError(null);
    try {
      await revokeIssuedDiploma(owsExchangeId);
      markDiplomaRevoked(appId, owsExchangeId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <SchoolShell active="graduation">
      <section className="sch-detail">
        <h1>Graduation decisions</h1>
        {error ? <p className="login-error">{error}</p> : null}
        {ready.length === 0 ? (
          <p>
            No approved learners are awaiting a graduation decision.
            {sent.length > 0 ? ` ${sent.length} decision(s) already submitted.` : ""}
          </p>
        ) : (
          ready.map((app) => (
            <form
              key={app.id}
              onSubmit={(event) => submitDecision(app.id, event)}
              style={{ borderTop: "1px solid var(--line)", paddingTop: "1rem", marginTop: "1rem" }}
            >
              <h2 style={{ fontSize: "1rem" }}>{app.learnerName}</h2>
              <label>
                <span>Programme</span>
                <input
                  name="programme"
                  defaultValue="Upper Secondary Diploma, Natural Sciences"
                  required
                />
              </label>
              <label>
                <span>Qualification code</span>
                <input name="qualificationCode" defaultValue="NQF-4-NATSCI" required />
              </label>
              <label>
                <span>Final result</span>
                <input name="result" defaultValue="Pass with distinction" required />
              </label>
              <label>
                <span>Signed decision text (hashed and referenced in the diploma)</span>
                <textarea
                  name="decisionText"
                  rows={3}
                  style={{
                    width: "100%",
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    padding: "0.5rem",
                  }}
                  defaultValue={`Graduation decision for ${app.learnerName}: programme completed, board decision 2026-06-12.`}
                />
              </label>
              <p style={{ fontSize: "0.78rem", color: "var(--muted)", margin: "0.5rem 0" }}>
                Signed by the institution. On submission the registry validates the institution and
                asks the learner to pay the diploma fee; the diploma is issued to their wallet in
                the same payment step.
              </p>
              <button
                type="submit"
                disabled={busy !== null}
                className="hint-pulse"
                style={{
                  background: "var(--brand)",
                  color: "#fff",
                  border: 0,
                  borderRadius: 999,
                  padding: "0.55rem 1.3rem",
                  fontWeight: 700,
                }}
              >
                {busy === app.id ? "Submitting…" : "Submit signed graduation decision"}
              </button>
            </form>
          ))
        )}
        {sent.length > 0 ? (
          <>
            <h2 style={{ marginTop: "1.5rem", fontSize: "1rem" }}>Submitted decisions</h2>
            {sent.map((app) => {
              const exchange = getDiplomaExchange(state, app.id);
              const issued = app.status === "issued" && !exchange?.revoked;
              return (
                <div
                  key={app.id}
                  style={{
                    borderTop: "1px solid var(--line)",
                    paddingTop: "0.9rem",
                    marginTop: "0.9rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "1rem",
                    }}
                  >
                    <strong>{app.learnerName}</strong>
                    {issued && exchange ? (
                      <button
                        type="button"
                        onClick={() => revoke(app.id, exchange.owsExchangeId)}
                        disabled={busy !== null}
                        style={{
                          background: "var(--bad)",
                          color: "#fff",
                          border: 0,
                          borderRadius: 999,
                          padding: "0.3rem 0.9rem",
                          fontWeight: 700,
                          fontSize: "0.78rem",
                          width: "auto",
                          marginTop: 0,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {busy === app.id ? "Revoking…" : "Revoke the diploma"}
                      </button>
                    ) : null}
                  </div>
                  {app.status === "payment_pending" ? (
                    <p style={{ margin: "0.35rem 0 0" }}>
                      Awaiting the learner&apos;s fee payment; the diploma is issued to their wallet
                      in the same step.
                    </p>
                  ) : exchange?.revoked ? (
                    <p style={{ margin: "0.35rem 0 0", color: "var(--bad)", fontWeight: 600 }}>
                      Diploma revoked
                      {exchange?.revokedAt ? ` on ${String(exchange.revokedAt).slice(0, 10)}` : ""}.
                      Fresh verifications reject it.
                    </p>
                  ) : (
                    <>
                      <p style={{ margin: "0.35rem 0 0", color: "var(--ok)", fontWeight: 600 }}>
                        Diploma issued to the learner&apos;s wallet.
                      </p>
                      <p
                        style={{ fontSize: "0.75rem", color: "var(--muted)", margin: "0.4rem 0 0" }}
                      >
                        Revocation is permanent and takes effect immediately: a fresh verification
                        anywhere rejects the credential.
                      </p>
                    </>
                  )}
                </div>
              );
            })}
          </>
        ) : null}
      </section>
    </SchoolShell>
  );
}
