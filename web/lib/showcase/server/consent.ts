import "server-only";

import { AGREEMENTS, type ConsentState } from "@/lib/showcase/agreements";
import { baseUrl, internalError, owsLog } from "@/lib/showcase/server/ows";

/**
 * The Consent Building Block client (main tenant). Stateless: the browser
 * store holds the learner-to-individual mapping, so every call takes the
 * individual id (or the pseudonymous identity) as explicit input. The
 * browser never sees the API key. Identity is client-asserted: acceptable
 * for this fictional demo - the individuals here exist only for showcase
 * runs and carry no PID attribute.
 */

export function agreementId(envVar: string): string {
  const value = process.env[envVar];
  if (!value) throw internalError(`${envVar} not configured`);
  return value;
}

async function consentApi(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  individualId?: string,
  body?: Record<string, unknown> | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Consent BB answers are shape-checked at each call site
): Promise<any> {
  const key = process.env.IGRANT_API_KEY;
  if (!key) throw internalError("IGRANT_API_KEY not set for Consent BB");
  const headers: Record<string, string> = {
    Authorization: `ApiKey ${key}`,
    "Content-Type": "application/json",
  };
  if (individualId) headers["X-ConsentBB-IndividualId"] = individualId;

  const init: RequestInit = { method, headers, cache: "no-store" };
  if (body) init.body = JSON.stringify(body);
  const resp = await fetch(`${baseUrl()}${path}`, init);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let data: any = null;
  try {
    data = await resp.json();
  } catch {
    data = null;
  }
  if (!resp.ok) {
    owsLog(
      "error",
      `Consent BB HTTP ${resp.status} ${method} ${path} ${JSON.stringify(data)?.slice(0, 300)}`,
    );
    throw new Error("The consent service could not complete the request.");
  }
  return data;
}

/**
 * Find or create the Consent BB individual for a learner pseudonym
 * (idempotent). The pseudonymous display name only; no PID attribute
 * reaches the Consent BB.
 */
export async function ensureIndividual(learner: {
  pseudonym: string;
  displayName: string;
}): Promise<string> {
  const externalId = `edu-showcase-${learner.pseudonym.slice(0, 24)}`;

  // Recover by externalId before creating, so a rerun never duplicates the
  // individual. The service answers HTTP 500 when nothing matches, so a
  // failed lookup means "not found", not an error.
  const found = await consentApi(
    "GET",
    `/v2/config/individuals?externalIndividualId=${encodeURIComponent(externalId)}&limit=1`,
  ).catch(() => null);
  let individualId: string | undefined = (found?.individuals ?? [])[0]?.id;

  if (!individualId) {
    const created = await consentApi("POST", "/v2/config/individual", undefined, {
      individual: {
        name: learner.displayName,
        email: `learner-${learner.pseudonym.slice(0, 12)}@wallet.invalid`,
        phone: "",
        externalId,
        externalIdType: "education-showcase-learner",
      },
    });
    individualId = created?.individual?.id;
  }
  if (!individualId) throw internalError("Consent BB returned no individual id");
  return individualId;
}

/** Record or update one consent decision (create-or-update). */
export async function setConsent(
  individualId: string,
  dataAgreementId: string,
  optIn: boolean,
): Promise<void> {
  const existing = await consentApi(
    "GET",
    `/v2/service/individual/record/data-agreement/${dataAgreementId}`,
    individualId,
  ).catch(() => null);
  const record = existing?.consentRecord;

  if (!record?.id) {
    const created = await consentApi(
      "POST",
      `/v2/service/individual/record/data-agreement/${dataAgreementId}`,
      individualId,
    );
    const createdRecord = created?.consentRecord;
    if (createdRecord && createdRecord.optIn !== optIn) {
      await consentApi(
        "PUT",
        `/v2/service/individual/record/consent-record/${createdRecord.id}?individualId=${individualId}&dataAgreementId=${dataAgreementId}`,
        individualId,
        { consentRecord: { optIn } },
      );
    }
    return;
  }

  if (record.optIn !== optIn) {
    await consentApi(
      "PUT",
      `/v2/service/individual/record/consent-record/${record.id}?individualId=${individualId}&dataAgreementId=${dataAgreementId}`,
      individualId,
      { consentRecord: { optIn } },
    );
  }
}

/** The three agreement states for one individual. */
export async function readConsents(individualId: string): Promise<ConsentState[]> {
  const states: ConsentState[] = [];
  for (const agreement of AGREEMENTS) {
    let optIn: boolean | null = null;
    try {
      const answer = await consentApi(
        "GET",
        `/v2/service/individual/record/data-agreement/${agreementId(agreement.envVar)}`,
        individualId,
      );
      const record = answer?.consentRecord;
      optIn = typeof record?.optIn === "boolean" ? record.optIn : null;
    } catch {
      optIn = null;
    }
    states.push({
      key: agreement.key,
      title: agreement.title,
      lawfulBasis: agreement.lawfulBasis,
      optional: agreement.optional,
      description: agreement.description,
      optIn,
    });
  }
  return states;
}

/** Right to be forgotten: delete every consent record of one individual. */
export async function deleteAllConsents(individualId: string): Promise<void> {
  await consentApi("DELETE", "/v2/service/individual/record", individualId);
}

/** Record the initial decisions made on the registration form. */
export async function recordRegistrationConsents(
  learner: { pseudonym: string; displayName: string },
  choices: { analytics: boolean; employerSharing: boolean },
): Promise<string> {
  const individualId = await ensureIndividual(learner);
  // The public-task notice is acknowledged, not consented to; recording it
  // makes the processing visible in the individual's consent dashboard.
  await setConsent(individualId, agreementId("AGREEMENT_ENROLMENT_ID"), true);
  await setConsent(individualId, agreementId("AGREEMENT_ANALYTICS_ID"), choices.analytics);
  await setConsent(individualId, agreementId("AGREEMENT_EMPLOYER_ID"), choices.employerSharing);
  return individualId;
}
