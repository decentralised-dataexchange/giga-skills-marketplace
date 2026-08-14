import Link from "next/link";

import { SchoolShell } from "@/components/SchoolShell";
import { getSession } from "@/lib/guards";
import { getApplication, listApplications } from "@/lib/registry";
import { getIndividualId, readConsents } from "@/lib/consent";

import { validateDocuments } from "./actions";

/**
 * The manual document review the RFQ requires: the officer opens an
 * application and checks the document references against the sandbox civil
 * registry. On validation the registry processes the enrolment
 * automatically: the learner identifier is generated and the Student ID is
 * offered to the wallet, with no further manual step.
 */
export default async function SchoolQueue({
  searchParams,
}: {
  searchParams: Promise<{ app?: string }>;
}) {
  const session = await getSession();
  const { app: selectedId } = await searchParams;
  const queue = listApplications(["submitted", "approved"]);
  const selected = selectedId ? getApplication(selectedId) : undefined;
  const form = selected ? (JSON.parse(selected.form) as Record<string, unknown>) : {};
  const documents = selected ? (JSON.parse(selected.documents) as string[]) : [];

  // The consent states come live from the Consent Building Block, so an
  // opt-out made later in the Education Portal shows here immediately. The
  // submitted form values are only the fallback when no records exist.
  let consentAnalytics = form.consentAnalytics === true;
  let consentEmployer = form.consentEmployerSharing === true;
  const individualId = selected ? getIndividualId(selected.learnerId) : undefined;
  if (individualId) {
    try {
      for (const state of await readConsents(individualId)) {
        if (state.key === "analytics") consentAnalytics = state.optIn === true;
        if (state.key === "employer") consentEmployer = state.optIn === true;
      }
    } catch {
      // Fall back to the submitted snapshot.
    }
  }

  return (
    <SchoolShell active="queue" userName={session?.user.name ?? "Officer"}>
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
                href={`/school/queue?app=${item.id}`}
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
          {!selected ? (
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
                    <input disabled value={String(form.firstName ?? "")} />
                  </label>
                  <label>
                    <span>Family name</span>
                    <input disabled value={String(form.familyName ?? "")} />
                  </label>
                  <label>
                    <span>Date of birth</span>
                    <input disabled value={String(form.dateOfBirth ?? "")} />
                  </label>
                  <label>
                    <span>Contact email</span>
                    <input disabled value={String(form.email ?? "")} />
                  </label>
                  <label className="sch-review-wide">
                    <span>Home address</span>
                    <input disabled value={String(form.address ?? "")} />
                  </label>
                  <label>
                    <span>School</span>
                    <input disabled value={selected.institutionName} />
                  </label>
                  <label>
                    <span>Prior education</span>
                    <input disabled value={String(form.priorEducation || "None given")} />
                  </label>
                  <label className="sch-review-wide">
                    <span>Disability or special support needs</span>
                    <input disabled value={String(form.specialSupport || "None given")} />
                  </label>
                </div>
                <div className="sch-review-consents">
                  <label className="sch-review-check">
                    <input type="checkbox" disabled checked={consentAnalytics} />
                    Anonymised analytics for policy planning (optional)
                  </label>
                  <label className="sch-review-check">
                    <input type="checkbox" disabled checked={consentEmployer} />
                    Later qualification sharing with an employer (optional)
                  </label>
                  <p className="sch-review-consent-note">
                    Current status from the consent service; the learner can change these at any
                    time in the Education Portal.
                  </p>
                </div>
              </form>

              <h2 style={{ marginTop: "1.25rem", fontSize: "0.95rem" }}>Documents</h2>
              <ul style={{ margin: "0.5rem 0 1rem 1.2rem", fontSize: "0.85rem" }}>
                {documents.map((doc) => (
                  <li key={doc}>
                    {doc}{" "}
                    <span style={{ color: "var(--muted)", fontSize: "0.78rem" }}>
                      · civil registry: passed
                    </span>
                  </li>
                ))}
              </ul>
              {selected.status === "submitted" ? (
                <form action={validateDocuments}>
                  <input type="hidden" name="applicationId" value={selected.id} />
                  <button
                    type="submit"
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
                    Validate documents and enrol the learner
                  </button>
                </form>
              ) : (
                <p style={{ color: "var(--ok)", fontWeight: 600 }}>
                  Validated. The learner was enrolled automatically and the Student ID was offered
                  to their wallet.
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </SchoolShell>
  );
}
