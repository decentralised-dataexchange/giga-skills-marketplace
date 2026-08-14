import 'server-only';

import { getDb } from '@/lib/db';
import { audit } from '@/lib/audit';
import { baseUrl, internalError, owsLog } from '@/lib/ows';
import type { Learner } from '@/lib/registry';

/**
 * The Consent Building Block client (main tenant). The three data agreements
 * are provisioned once; each learner is onboarded as an individual, and the
 * app-user-to-individual mapping lives server-side in consent_links. The
 * browser never sees the API key or an individual id.
 */

export const AGREEMENTS = [
  {
    envVar: 'AGREEMENT_ENROLMENT_ID',
    key: 'enrolment',
    title: 'Core enrolment processing',
    lawfulBasis: 'public_task',
    optional: false,
    description:
      'Registration, review, approval and credential issuance. A public task: it does not depend on consent.',
  },
  {
    envVar: 'AGREEMENT_ANALYTICS_ID',
    key: 'analytics',
    title: 'Anonymised education analytics',
    lawfulBasis: 'consent',
    optional: true,
    description:
      'Optional anonymised statistics for policy planning. Declining never affects your registration.',
  },
  {
    envVar: 'AGREEMENT_EMPLOYER_ID',
    key: 'employer',
    title: 'Employer qualification sharing',
    lawfulBasis: 'consent',
    optional: true,
    description:
      'Optional later sharing of your qualification with an employer; every share still needs your wallet approval.',
  },
] as const;

export function agreementId(envVar: string): string {
  const value = process.env[envVar];
  if (!value) throw internalError(`${envVar} not configured`);
  return value;
}

async function consentApi(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  individualId?: string,
  body?: Record<string, unknown> | null
): Promise<any> {
  const key = process.env.IGRANT_API_KEY;
  if (!key) throw internalError('IGRANT_API_KEY not set for Consent BB');
  const headers: Record<string, string> = {
    Authorization: `ApiKey ${key}`,
    'Content-Type': 'application/json',
  };
  if (individualId) headers['X-ConsentBB-IndividualId'] = individualId;

  const resp = await fetch(`${baseUrl()}${path}`, {
    method,
    headers,
    cache: 'no-store',
    body: body ? JSON.stringify(body) : undefined,
  });
  let data: any = null;
  try {
    data = await resp.json();
  } catch {
    data = null;
  }
  if (!resp.ok) {
    owsLog(
      'error',
      `Consent BB HTTP ${resp.status} ${method} ${path} ${JSON.stringify(data)?.slice(0, 300)}`
    );
    throw new Error('The consent service could not complete the request.');
  }
  return data;
}

/** Find or create the Consent BB individual for a learner (idempotent). */
export async function ensureIndividual(learner: Learner): Promise<string> {
  const db = getDb();
  const existing = db
    .prepare('SELECT "individualId" FROM "consent_links" WHERE "learnerId" = ?')
    .get(learner.id) as { individualId: string } | undefined;
  if (existing) return existing.individualId;

  // Recover by externalId before creating, so a lost mapping never
  // duplicates the individual. The service answers HTTP 500 when nothing
  // matches, so a failed lookup means "not found", not an error.
  const found = await consentApi(
    'GET',
    `/v2/config/individuals?externalIndividualId=${encodeURIComponent(learner.id)}&limit=1`
  ).catch(() => null);
  let individualId: string | undefined = (found?.individuals ?? [])[0]?.id;

  if (!individualId) {
    const created = await consentApi('POST', '/v2/config/individual', undefined, {
      individual: {
        // The pseudonymous display name only; no PID attribute reaches
        // the Consent BB.
        name: learner.displayName,
        email: `learner-${learner.pseudonym.slice(0, 12)}@wallet.invalid`,
        phone: '',
        externalId: learner.id,
        externalIdType: 'education-showcase-learner',
      },
    });
    individualId = created?.individual?.id;
  }
  if (!individualId) throw internalError('Consent BB returned no individual id');

  db.prepare(
    'INSERT INTO "consent_links" ("learnerId", "individualId", "createdAt") VALUES (?, ?, ?)'
  ).run(learner.id, individualId, new Date().toISOString());

  return individualId;
}

export function getIndividualId(learnerId: string): string | undefined {
  const row = getDb()
    .prepare('SELECT "individualId" FROM "consent_links" WHERE "learnerId" = ?')
    .get(learnerId) as { individualId: string } | undefined;
  return row?.individualId;
}

/** Record or update one consent decision (create-or-update). */
export async function setConsent(
  individualId: string,
  dataAgreementId: string,
  optIn: boolean
): Promise<void> {
  const existing = await consentApi(
    'GET',
    `/v2/service/individual/record/data-agreement/${dataAgreementId}`,
    individualId
  ).catch(() => null);
  const record = existing?.consentRecord;

  if (!record?.id) {
    const created = await consentApi(
      'POST',
      `/v2/service/individual/record/data-agreement/${dataAgreementId}`,
      individualId
    );
    const createdRecord = created?.consentRecord;
    if (createdRecord && createdRecord.optIn !== optIn) {
      await consentApi(
        'PUT',
        `/v2/service/individual/record/consent-record/${createdRecord.id}?individualId=${individualId}&dataAgreementId=${dataAgreementId}`,
        individualId,
        { consentRecord: { optIn } }
      );
    }
    return;
  }

  if (record.optIn !== optIn) {
    await consentApi(
      'PUT',
      `/v2/service/individual/record/consent-record/${record.id}?individualId=${individualId}&dataAgreementId=${dataAgreementId}`,
      individualId,
      { consentRecord: { optIn } }
    );
  }
}

export type ConsentState = {
  key: string;
  title: string;
  lawfulBasis: string;
  optional: boolean;
  description: string;
  optIn: boolean | null;
};

/** The three agreement states for one individual. */
export async function readConsents(individualId: string): Promise<ConsentState[]> {
  const states: ConsentState[] = [];
  for (const agreement of AGREEMENTS) {
    let optIn: boolean | null = null;
    try {
      const answer = await consentApi(
        'GET',
        `/v2/service/individual/record/data-agreement/${agreementId(agreement.envVar)}`,
        individualId
      );
      const record = answer?.consentRecord;
      optIn = typeof record?.optIn === 'boolean' ? record.optIn : null;
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
export async function deleteAllConsents(
  individualId: string,
  actor: { userId: string }
): Promise<void> {
  await consentApi('DELETE', '/v2/service/individual/record', individualId);
  audit({
    actorUserId: actor.userId,
    actorRole: 'dpa_admin',
    action: 'consent.erased_all',
    subjectType: 'individual',
    subjectId: 'redacted',
  });
}

/** Record the initial decisions made on the registration form. */
export async function recordRegistrationConsents(
  learner: Learner,
  choices: { analytics: boolean; employerSharing: boolean }
): Promise<void> {
  const individualId = await ensureIndividual(learner);
  // The public-task notice is acknowledged, not consented to; recording it
  // makes the processing visible in the individual's consent dashboard.
  await setConsent(individualId, agreementId('AGREEMENT_ENROLMENT_ID'), true);
  await setConsent(
    individualId,
    agreementId('AGREEMENT_ANALYTICS_ID'),
    choices.analytics
  );
  await setConsent(
    individualId,
    agreementId('AGREEMENT_EMPLOYER_ID'),
    choices.employerSharing
  );

  audit({
    actorUserId: learner.userId,
    actorRole: 'learner',
    action: 'consent.recorded',
    subjectType: 'learner',
    subjectId: learner.id,
    payload: {
      analytics: choices.analytics,
      employerSharing: choices.employerSharing,
    },
  });
}
