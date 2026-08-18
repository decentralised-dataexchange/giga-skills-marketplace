"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { audit } from "@/lib/showcase/audit";
import { getInstitutions } from "@/lib/showcase/institutions";
import { submitApplication } from "@/lib/showcase/registry";
import { getState, latestApplication, store } from "@/lib/showcase/store";
import { useShowcaseStore } from "@/lib/showcase/use-store";

import { recordConsents } from "./actions";

/**
 * The learner registration form. Identity fields are prefilled from the
 * verified PID presentation (held transiently in the browser store);
 * documents are sample references; the two consent decisions are separate
 * and the analytics one is optional by design.
 */
export default function RegisterPage() {
  const router = useRouter();
  const state = useShowcaseStore();
  const learner = state.learner;
  const existing = latestApplication(state);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!state.hydrated) return;
    if (!learner) router.replace("/showcase/education/login");
    else if (existing) router.replace("/showcase/education/home");
  }, [state.hydrated, learner, existing, router]);

  if (!state.hydrated || !learner || existing) return null;

  const schools = getInstitutions("school");
  const [firstName, ...rest] = learner.displayName.split(" ");
  const prefill = learner.prefill ?? { dateOfBirth: "", email: "", address: "" };

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const data = new FormData(event.currentTarget);

    const documents = ["birth-certificate", "proof-of-address", "photo", "prior-record"]
      .map((name) => String(data.get(`doc-${name}`) ?? "").trim())
      .filter(Boolean);
    const choices = {
      analytics: data.get("consentAnalytics") === "on",
      employerSharing: data.get("consentEmployerSharing") === "on",
    };

    try {
      submitApplication({
        institutionId: String(data.get("institutionId") ?? ""),
        form: {
          firstName: String(data.get("firstName") ?? ""),
          familyName: String(data.get("familyName") ?? ""),
          dateOfBirth: String(data.get("dateOfBirth") ?? ""),
          email: String(data.get("email") ?? ""),
          address: String(data.get("address") ?? ""),
          priorEducation: String(data.get("priorEducation") ?? ""),
          specialSupport: String(data.get("specialSupport") ?? ""),
          consentAnalytics: choices.analytics,
          consentEmployerSharing: choices.employerSharing,
        },
        documents,
      });
    } catch (cause) {
      setBusy(false);
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
      return;
    }

    // Consent recording is best-effort by design: a consent-service problem,
    // or declining the optional agreements, must never block enrolment.
    try {
      const individualId = await recordConsents(
        { pseudonym: learner!.pseudonym, displayName: learner!.displayName },
        choices,
      );
      const current = getState().learner;
      if (current) store.setLearner({ ...current, individualId });
      await audit({
        actorPseudonym: learner!.pseudonym,
        actorRole: "learner",
        action: "consent.recorded",
        subjectType: "learner",
        subjectId: "redacted",
        payload: choices,
      });
    } catch (cause) {
      console.error("[Register] consent recording failed:", cause);
    }

    router.push("/showcase/education/home");
  }

  return (
    <>
      <section className="edu-hero">
        <h1>Register as a learner</h1>
        <p>
          Your name comes from the identity your wallet presented. Complete the rest of the
          application; a school officer will review your documents manually before the Ministry
          approves the enrolment.
        </p>
      </section>

      <div className="edu-card">
        <form onSubmit={submit}>
          <label>
            <span>First name (from your PID)</span>
            <input name="firstName" defaultValue={firstName ?? ""} required />
          </label>
          <label>
            <span>Family name (from your PID)</span>
            <input name="familyName" defaultValue={rest.join(" ")} required />
          </label>
          <label>
            <span>Date of birth (from your PID)</span>
            <input name="dateOfBirth" type="date" defaultValue={prefill.dateOfBirth} required />
          </label>
          <label>
            <span>Contact email (from your PID)</span>
            <input name="email" type="email" defaultValue={prefill.email} required />
          </label>
          <label>
            <span>Home address (from your PID)</span>
            <input name="address" defaultValue={prefill.address} required />
          </label>
          <label>
            <span>School</span>
            <select name="institutionId" required>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Prior education (optional)</span>
            <input name="priorEducation" placeholder="Previous school and last completed year" />
          </label>
          <label>
            <span>Disability or special support needs (optional)</span>
            <input name="specialSupport" placeholder="Any support the school should plan for" />
          </label>

          <h2 style={{ marginTop: "1.75rem", fontSize: "1.1rem" }}>Document references</h2>
          <label>
            <span>Birth certificate or national ID reference</span>
            <input name="doc-birth-certificate" defaultValue="DOC-BC-2026-00417" required />
          </label>
          <label>
            <span>Proof of address reference</span>
            <input name="doc-proof-of-address" defaultValue="DOC-PA-2026-00291" required />
          </label>
          <label>
            <span>Photo reference</span>
            <input name="doc-photo" defaultValue="DOC-PH-2026-00113" required />
          </label>
          <label>
            <span>Previous school record reference (optional)</span>
            <input name="doc-prior-record" />
          </label>

          <h2 style={{ marginTop: "1.75rem", fontSize: "1.1rem" }}>Your data choices</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: "0.5rem" }}>
            Enrolment processing itself is a public task and needs no consent. These two choices are
            separate, optional, and can be withdrawn at any time. Declining them does not affect
            your registration.
          </p>
          <label style={{ fontWeight: 400 }}>
            <input
              type="checkbox"
              name="consentAnalytics"
              style={{ width: "auto", marginRight: "0.5rem" }}
            />
            Allow anonymised use of my learner data for education analytics and policy planning.
          </label>
          <label style={{ fontWeight: 400 }}>
            <input
              type="checkbox"
              name="consentEmployerSharing"
              style={{ width: "auto", marginRight: "0.5rem" }}
            />
            Allow sharing my qualification with an employer later, when I approve each request in my
            wallet.
          </label>

          {error ? <p className="login-error">{error}</p> : null}
          <button type="submit" disabled={busy}>
            {busy ? "Submitting…" : "Submit registration"}
          </button>
        </form>
      </div>
    </>
  );
}
