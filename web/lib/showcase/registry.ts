"use client";

/**
 * The National Learner Registry domain, browser edition: applications,
 * approvals, ULID generation and the state machine around credential
 * issuance and the TS12 payment gate. Every state change writes an audit
 * event into the store. The OWS calls themselves (issue, revoke) stay in
 * server actions; these functions record their results.
 *
 * Application states:
 *   submitted → approved → graduation_submitted → payment_pending → issued
 * The school's document validation and graduation submission each trigger
 * automatic registry processing, so the intermediate states are momentary.
 */

import { audit } from "@/lib/showcase/audit";
import { sha256Hex } from "@/lib/showcase/audit";
import { newId, newUlid } from "@/lib/showcase/ids";
import { getInstitution } from "@/lib/showcase/institutions";
import {
  getState,
  patchApplication,
  patchExchange,
  store,
  type Application,
  type ApplicationForm,
} from "@/lib/showcase/store";

/** The learner submits the registration form. */
export function submitApplication(entry: {
  institutionId: string;
  form: ApplicationForm;
  documents: string[];
}): string {
  const state = getState();
  const learner = state.learner;
  if (!learner) throw new Error("No learner profile in this browser.");
  const institution = getInstitution(entry.institutionId);
  if (!institution) throw new Error("Unknown institution.");

  const now = new Date().toISOString();
  const id = newId("app");
  const application: Application = {
    id,
    learnerPseudonym: learner.pseudonym,
    learnerName: learner.displayName,
    institutionId: institution.id,
    institutionName: institution.name,
    esrRef: institution.esrRef,
    status: "submitted",
    form: entry.form,
    documents: entry.documents,
    programme: null,
    qualificationCode: null,
    result: null,
    graduationDocHash: null,
    paymentExchangeId: null,
    paymentLedgerRef: null,
    createdAt: now,
    updatedAt: now,
  };
  store.setApplications([...state.applications, application]);
  // The prefill served its purpose; the confirmed form is the record now.
  store.setLearner({ ...learner, prefill: null });

  void audit({
    actorPseudonym: learner.pseudonym,
    actorRole: "learner",
    action: "application.submitted",
    subjectType: "application",
    subjectId: id,
  });
  return id;
}

/**
 * The manual document review by the school officer. Approval by the registry
 * then runs automatically: the ULID is generated and the learner profile is
 * updated. Returns the data the Student ID issuance broker call needs; the
 * caller records the returned offer with `attachStudentIdOffer`.
 */
export function validateDocumentsAndApprove(applicationId: string): {
  ulid: string;
  claims: {
    ulid: string;
    firstName: string;
    familyName: string;
    displayName: string;
    dateOfBirth: string;
    email: string;
  };
} {
  const app = getState().applications.find((a) => a.id === applicationId);
  if (!app || app.status !== "submitted") {
    throw new Error("The application is not awaiting review.");
  }

  void audit({
    actorPseudonym: null,
    actorRole: "school_officer",
    action: "application.documents_validated",
    subjectType: "application",
    subjectId: applicationId,
    payload: { civilRegistryCheck: "sandbox:passed" },
  });

  const ulid = newUlid();
  const learner = getState().learner;
  if (learner && learner.pseudonym === app.learnerPseudonym) {
    store.setLearner({ ...learner, ulid });
  }
  patchApplication(applicationId, { status: "approved" });

  void audit({
    actorPseudonym: null,
    actorRole: "system",
    action: "application.approved",
    subjectType: "application",
    subjectId: applicationId,
    payload: { ulid, processing: "automatic" },
  });

  return {
    ulid,
    claims: {
      ulid,
      firstName: app.form.firstName || app.learnerName.split(" ")[0] || "",
      familyName: app.form.familyName || app.learnerName.split(" ").slice(1).join(" "),
      displayName: app.learnerName,
      dateOfBirth: app.form.dateOfBirth,
      email: app.form.email,
    },
  };
}

/** Record the Student ID offer returned by the issuance broker. */
export function attachStudentIdOffer(
  applicationId: string,
  offer: { exchangeId: string; offer: string; pin: string },
): void {
  const app = getState().applications.find((a) => a.id === applicationId);
  if (!app) return;
  patchApplication(applicationId, {
    form: {
      ...app.form,
      studentIdOffer: offer.offer,
      studentIdExchangeId: offer.exchangeId,
      studentIdPin: offer.pin,
    },
  });
  patchExchange(offer.exchangeId, {
    direction: "issuance",
    credentialType: "student-id",
    applicationId,
    status: "offer_sent",
  });
  void audit({
    actorPseudonym: null,
    actorRole: "system",
    action: "credential.student_id_offered",
    subjectType: "exchange",
    subjectId: offer.exchangeId,
    payload: { applicationId },
  });
}

/**
 * The school submits the signed graduation decision. The registry processes
 * it automatically: the institution is validated against the sandbox
 * Education Service Registry and the diploma is placed behind the fee.
 */
export async function submitGraduation(
  applicationId: string,
  decision: {
    programme: string;
    qualificationCode: string;
    result: string;
    decisionText: string;
  },
): Promise<void> {
  const app = getState().applications.find((a) => a.id === applicationId);
  if (!app || app.status !== "approved") {
    throw new Error("The application is not ready for a graduation decision.");
  }
  const docHash = await sha256Hex(decision.decisionText);
  patchApplication(applicationId, {
    programme: decision.programme,
    qualificationCode: decision.qualificationCode,
    result: decision.result,
    graduationDocHash: docHash,
    status: "graduation_submitted",
  });
  await audit({
    actorPseudonym: null,
    actorRole: "school_officer",
    action: "graduation.submitted",
    subjectType: "application",
    subjectId: applicationId,
    payload: {
      programme: decision.programme,
      qualificationCode: decision.qualificationCode,
      documentHash: docHash,
      institutionSignature: "sandbox:tsp-signed",
    },
  });

  // Automatic registry processing: the sandbox Education Service Registry
  // check, then the fee requirement.
  if (!app.esrRef.startsWith("ESR-")) {
    throw new Error("The institution is not authorised in the Education Service Registry.");
  }
  await audit({
    actorPseudonym: null,
    actorRole: "system",
    action: "graduation.institution_validated",
    subjectType: "application",
    subjectId: applicationId,
    payload: { esrRef: app.esrRef, registry: "sandbox" },
  });

  patchApplication(applicationId, { status: "payment_pending" });
  await audit({
    actorPseudonym: null,
    actorRole: "system",
    action: "graduation.payment_required",
    subjectType: "application",
    subjectId: applicationId,
  });
}

/** Record the paid diploma issuance request returned by the broker. */
export function attachDiplomaOffer(
  applicationId: string,
  offer: { exchangeId: string; qrUri: string; method: "account" | "card" },
): void {
  const app = getState().applications.find((a) => a.id === applicationId);
  if (!app) return;
  patchApplication(applicationId, {
    form: {
      ...app.form,
      diplomaOffer: offer.qrUri,
      diplomaExchangeId: offer.exchangeId,
      paymentMethod: offer.method,
    },
  });
  patchExchange(offer.exchangeId, {
    direction: "issuance",
    credentialType: "diploma",
    applicationId,
    status: "offer_sent",
  });
  void audit({
    actorPseudonym: getState().learner?.pseudonym ?? null,
    actorRole: "learner",
    action: "payment.dynamic_issuance_started",
    subjectType: "exchange",
    subjectId: offer.exchangeId,
    payload: { applicationId, amount: 50, currency: "EUR", method: offer.method },
  });
}

const CREDENTIAL_DONE_TOPICS = [
  "openid.credential.credential_acked",
  "openid.credential.credential_accepted",
];

/**
 * Record a webhook topic for an exchange. When the wallet holds the diploma
 * of a payment-pending application (the payment presentation succeeded
 * inside the same dynamic exchange), record the simulated ledger entry and
 * close the application - the completion the webhook handler used to run.
 */
export function recordExchangeTopic(owsExchangeId: string, topic: string): void {
  const state = getState();
  const exchange = state.exchanges[owsExchangeId];
  // Polling re-reports the same status every tick; only a change writes.
  if (exchange?.status === topic) return;
  patchExchange(owsExchangeId, { status: topic });

  if (!exchange || exchange.credentialType !== "diploma") return;
  if (!CREDENTIAL_DONE_TOPICS.includes(topic)) return;
  const app = exchange.applicationId
    ? state.applications.find((a) => a.id === exchange.applicationId)
    : undefined;
  if (!app || app.status !== "payment_pending") return;

  const ledgerRef = `LEDGER-${newId("pay").slice(4, 16)}`;
  patchApplication(app.id, {
    paymentExchangeId: owsExchangeId,
    paymentLedgerRef: ledgerRef,
    status: "issued",
  });
  void audit({
    actorPseudonym: null,
    actorRole: "system",
    action: "payment.confirmed",
    subjectType: "application",
    subjectId: app.id,
    payload: { credentialExchangeId: owsExchangeId, ledgerRef, ledger: "sandbox" },
  });
  void audit({
    actorPseudonym: null,
    actorRole: "system",
    action: "credential.diploma_delivered",
    subjectType: "exchange",
    subjectId: owsExchangeId,
    payload: { applicationId: app.id },
  });
}

/** Record a completed revocation (the OWS call happens in the server action). */
export function markDiplomaRevoked(applicationId: string, owsExchangeId: string): void {
  const now = new Date().toISOString();
  patchExchange(owsExchangeId, { revoked: true, revokedAt: now });
  void audit({
    actorPseudonym: null,
    actorRole: "school_officer",
    action: "credential.diploma_revoked",
    subjectType: "exchange",
    subjectId: owsExchangeId,
    payload: { applicationId },
  });
}
