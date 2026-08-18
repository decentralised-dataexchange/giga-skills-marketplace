"use client";

import { useCallback, useEffect, useState } from "react";

import { type ConsentState } from "@/lib/showcase/agreements";
import { audit } from "@/lib/showcase/audit";
import { deleteLearnerData, getState, store } from "@/lib/showcase/store";
import { useShowcaseStore } from "@/lib/showcase/use-store";

import { eraseAllConsents, readConsentStates, updateConsentChoice } from "./actions";

export default function ConsentsPage() {
  const { learner } = useShowcaseStore();
  const individualId = learner?.individualId ?? null;
  // The fetched states remember which individual they belong to, so a
  // deleted account simply stops matching - no state reset needed.
  const [fetched, setFetched] = useState<{ id: string; states: ConsentState[] } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const consents = individualId && fetched?.id === individualId ? fetched.states : [];

  const refresh = useCallback(async () => {
    if (!individualId) return;
    try {
      setFetched({ id: individualId, states: await readConsentStates(individualId) });
    } catch {
      setFetched(null);
    }
  }, [individualId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async: state settles only after the broker answers
    void refresh();
  }, [refresh]);

  async function toggle(consent: ConsentState) {
    if (!learner || busy) return;
    setBusy(consent.key);
    try {
      const optIn = !consent.optIn;
      const id = await updateConsentChoice(
        { pseudonym: learner.pseudonym, displayName: learner.displayName },
        consent.key,
        optIn,
      );
      const current = getState().learner;
      if (current && !current.individualId) store.setLearner({ ...current, individualId: id });
      await audit({
        actorPseudonym: learner.pseudonym,
        actorRole: "learner",
        action: optIn ? "consent.given" : "consent.withdrawn",
        subjectType: "agreement",
        subjectId: consent.key,
      });
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  /**
   * Delete the learner's account: remote consent records (best effort) and
   * every showcase key of this browser except the append-only audit trail.
   * Wallet credentials are untouched; the audit events are written before
   * the local identity disappears, without naming it.
   */
  async function deleteMyAccount() {
    if (!learner || busy) return;
    setBusy("delete");
    if (individualId) {
      try {
        await eraseAllConsents(individualId);
        await audit({
          actorPseudonym: learner.pseudonym,
          actorRole: "learner",
          action: "consent.erased_all",
          subjectType: "individual",
          subjectId: "redacted",
        });
      } catch {
        // The account deletion proceeds regardless.
      }
    }
    await audit({
      actorPseudonym: learner.pseudonym,
      actorRole: "learner",
      action: "learner.account_deleted",
      subjectType: "learner",
      subjectId: "redacted",
    });
    deleteLearnerData();
    // A full navigation, not the client router: clearing the session re-arms
    // the route guard, and a hard leave wins that race deterministically.
    window.location.assign("/showcase/education");
  }

  return (
    <>
      <section className="edu-hero">
        <h1>Your data choices</h1>
        <p>
          These agreements govern how the education service handles your data. The two optional ones
          are yours to change at any time; withdrawing never affects your enrolment or your
          credentials.
        </p>
      </section>

      {consents.length === 0 ? (
        <div className="edu-card">
          <h2>No records yet</h2>
          <p>Your consent records appear here after you submit your registration.</p>
        </div>
      ) : (
        consents.map((consent) => (
          <div className="edu-card" key={consent.key}>
            <h2>{consent.title}</h2>
            <p>{consent.description}</p>
            <p style={{ marginTop: "0.6rem", fontSize: "0.85rem" }}>
              Lawful basis: <strong>{consent.lawfulBasis}</strong>
              {" · "}
              Status:{" "}
              <strong style={{ color: consent.optIn ? "var(--ok)" : "var(--muted)" }}>
                {consent.optional
                  ? consent.optIn
                    ? "allowed"
                    : "declined / withdrawn"
                  : "active (public task)"}
              </strong>
            </p>
            {consent.optional ? (
              <button
                type="button"
                onClick={() => toggle(consent)}
                disabled={busy !== null}
                style={{
                  marginTop: "0.75rem",
                  background: consent.optIn ? "transparent" : "var(--brand)",
                  color: consent.optIn ? "var(--bad)" : "#fff",
                  border: consent.optIn ? "1.5px solid var(--bad)" : 0,
                  borderRadius: 8,
                  padding: "0.5rem 1.1rem",
                  fontWeight: 600,
                }}
              >
                {busy === consent.key ? "Saving…" : consent.optIn ? "Opt out" : "Opt in"}
              </button>
            ) : null}
          </div>
        ))
      )}

      {learner ? (
        <div className="edu-card">
          <h2>Delete my account</h2>
          <p>
            Removes your learner profile, your application, and your consent records from this
            service, clears the demo data stored in this browser, and signs you out. Credentials
            already in your wallet stay in your wallet; a revoked credential stays revoked.
          </p>
          <button
            type="button"
            onClick={deleteMyAccount}
            disabled={busy !== null}
            style={{
              marginTop: "0.75rem",
              background: "var(--bad)",
              color: "#fff",
              border: 0,
              borderRadius: 8,
              padding: "0.5rem 1.1rem",
              fontWeight: 600,
            }}
          >
            {busy === "delete" ? "Deleting…" : "Delete my account"}
          </button>
        </div>
      ) : null}
    </>
  );
}
