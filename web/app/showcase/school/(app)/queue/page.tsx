"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { PortalLink } from "@/components/showcase/portal-link";
import { SchoolShell } from "@/components/showcase/school-shell";
import { attachStudentIdOffer, validateDocumentsAndApprove } from "@/lib/showcase/registry";
import { useShowcaseStore } from "@/lib/showcase/use-store";
import type { ConsentState } from "@/lib/showcase/agreements";

import { issueStudentId, readLearnerConsents } from "./actions";

/**
 * The manual document review: the officer opens an application and checks
 * the document references against the sandbox civil registry. On validation
 * the registry processes the enrolment automatically: the learner
 * identifier is generated and the Student ID is offered to the wallet, with
 * no further manual step.
 */
function SchoolQueueContent() {
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("app");
  const state = useShowcaseStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The fetched states remember which individual they belong to, so a
  // selection change simply stops matching - no state reset needed.
  const [fetched, setFetched] = useState<{ id: string; states: ConsentState[] } | null>(null);

  const queue = state.applications
    .filter((app) => app.status === "submitted" || app.status === "approved")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const selected = selectedId ? state.applications.find((app) => app.id === selectedId) : undefined;
  const form = selected?.form;

  // The consent states come live from the Consent Building Block, so an
  // opt-out made later in the Education Portal shows here immediately. The
  // submitted form values are only the fallback when no records exist.
  const individualId =
    selected && state.learner?.pseudonym === selected.learnerPseudonym
      ? state.learner.individualId
      : null;
  useEffect(() => {
    let cancelled = false;
    if (!individualId) return;
    readLearnerConsents(individualId)
      .then((states) => {
        if (!cancelled) setFetched({ id: individualId, states });
      })
      .catch(() => {
        // Fall back to the submitted snapshot.
      });
    return () => {
      cancelled = true;
    };
  }, [individualId]);

  const liveConsents = individualId && fetched?.id === individualId ? fetched.states : null;

  let consentAnalytics = form?.consentAnalytics === true;
  let consentEmployer = form?.consentEmployerSharing === true;
  for (const consent of liveConsents ?? []) {
    if (consent.key === "analytics") consentAnalytics = consent.optIn === true;
    if (consent.key === "employer") consentEmployer = consent.optIn === true;
  }

  async function validate() {
    if (!selected || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { claims } = validateDocumentsAndApprove(selected.id);
      const offer = await issueStudentId(claims);
      attachStudentIdOffer(selected.id, offer);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SchoolShell active="queue">
      <div className="sch-workbench">
        <aside className="sch-queue">
          <div className="sch-queue-head">Applications</div>
          {queue.length === 0 ? (
            <p className="sch-queue-empty">
              No applications yet. New learner registrations appear here for manual document review.
            </p>
          ) : (
            queue.map((item) => (
              <Link
                key={item.id}
                className={
                  item.status === "submitted" && !selected
                    ? "sch-queue-item hint-pulse"
                    : "sch-queue-item"
                }
                href={`/showcase/school/queue?app=${item.id}`}
              >
                <strong>{item.learnerName}</strong>
                <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                  {item.status === "submitted" ? "Awaiting review" : "Enrolled"} ·{" "}
                  {item.createdAt.slice(0, 10)}
                </div>
              </Link>
            ))
          )}
        </aside>
        <section className="sch-detail">
          {!selected || !form ? (
            <>
              <h1>Manual document review</h1>
              <p>
                Select an application from the queue to check the uploaded documents against the
                civil registry and confirm prior education records. Validation enrols the learner
                automatically and offers the Student ID to their wallet.
              </p>
            </>
          ) : (
            <>
              <h1>{selected.learnerName}</h1>
              <p>
                Applied to {selected.institutionName} · submitted {selected.createdAt.slice(0, 10)}
              </p>

              <h2 style={{ marginTop: "1.25rem", fontSize: "0.95rem" }}>
                Application as submitted
              </h2>
              <form className="sch-review-form">
                <div className="sch-review-grid">
                  <label>
                    <span>First name</span>
                    <input disabled value={form.firstName} />
                  </label>
                  <label>
                    <span>Family name</span>
                    <input disabled value={form.familyName} />
                  </label>
                  <label>
                    <span>Date of birth</span>
                    <input disabled value={form.dateOfBirth} />
                  </label>
                  <label>
                    <span>Contact email</span>
                    <input disabled value={form.email} />
                  </label>
                  <label className="sch-review-wide">
                    <span>Home address</span>
                    <input disabled value={form.address} />
                  </label>
                  <label>
                    <span>School</span>
                    <input disabled value={selected.institutionName} />
                  </label>
                  <label>
                    <span>Prior education</span>
                    <input disabled value={form.priorEducation || "None given"} />
                  </label>
                  <label className="sch-review-wide">
                    <span>Disability or special support needs</span>
                    <input disabled value={form.specialSupport || "None given"} />
                  </label>
                </div>
                <div className="sch-review-consents">
                  <label className="sch-review-check">
                    <input type="checkbox" disabled checked={consentAnalytics} readOnly />
                    Anonymised analytics for policy planning (optional)
                  </label>
                  <label className="sch-review-check">
                    <input type="checkbox" disabled checked={consentEmployer} readOnly />
                    Later qualification sharing with an employer (optional)
                  </label>
                  <p className="sch-review-consent-note">
                    Current status from the consent service; the learner can change these at any
                    time in the <PortalLink to="education">Education Portal</PortalLink>.
                  </p>
                </div>
              </form>

              <h2 style={{ marginTop: "1.25rem", fontSize: "0.95rem" }}>Documents</h2>
              <ul style={{ margin: "0.5rem 0 1rem 1.2rem", fontSize: "0.85rem" }}>
                {selected.documents.map((doc) => (
                  <li key={doc}>
                    {doc}{" "}
                    <span style={{ color: "var(--muted)", fontSize: "0.78rem" }}>
                      · civil registry: passed
                    </span>
                  </li>
                ))}
              </ul>
              {selected.status === "submitted" ? (
                <>
                  <button
                    type="button"
                    onClick={validate}
                    disabled={busy}
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
                    {busy ? "Validating…" : "Validate documents and enrol the learner"}
                  </button>
                  {error ? <p className="login-error">{error}</p> : null}
                </>
              ) : (
                <p style={{ color: "var(--ok)", fontWeight: 600 }}>
                  Validated. The learner was enrolled automatically and the Student ID issued. The
                  student should now go to the{" "}
                  <PortalLink to="education">National Education Portal</PortalLink> and receive the
                  Student ID by scanning the QR code.
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </SchoolShell>
  );
}

export default function SchoolQueue() {
  return (
    <Suspense fallback={null}>
      <SchoolQueueContent />
    </Suspense>
  );
}
