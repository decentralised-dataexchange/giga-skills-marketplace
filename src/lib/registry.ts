import 'server-only';

import { createHash, randomInt } from 'crypto';

import { getDb } from '@/lib/db';
import { newId, newUlid } from '@/lib/ids';
import { audit } from '@/lib/audit';
import { ows, requiredEnv } from '@/lib/ows';

/**
 * The National Learner Registry domain: applications, approvals, ULID
 * generation, credential issuance and the TS12 payment gate. Every state
 * change writes an audit event. All functions run server-side only and are
 * called from role-guarded server actions or the webhook handler.
 *
 * Application states:
 *   draft → submitted → school_validated → approved →
 *   graduation_submitted → payment_pending → issued
 */

export type Application = {
  id: string;
  learnerId: string;
  institutionId: string;
  status: string;
  form: string;
  documents: string;
  programme: string | null;
  qualificationCode: string | null;
  result: string | null;
  graduationDocHash: string | null;
  paymentExchangeId: string | null;
  paymentLedgerRef: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Learner = {
  id: string;
  userId: string;
  pseudonym: string;
  displayName: string;
  ulid: string | null;
};

export function getLearnerByUserId(userId: string): Learner | undefined {
  return getDb()
    .prepare('SELECT * FROM "learners" WHERE "userId" = ?')
    .get(userId) as Learner | undefined;
}

export function getInstitutions(kind?: string) {
  const db = getDb();
  return (
    kind
      ? db.prepare('SELECT * FROM "institutions" WHERE "kind" = ?').all(kind)
      : db.prepare('SELECT * FROM "institutions"').all()
  ) as Array<{ id: string; name: string; kind: string; esrRef: string }>;
}

export function listApplications(statuses: string[]): Array<Application & { learnerName: string; institutionName: string }> {
  const marks = statuses.map(() => '?').join(',');
  return getDb()
    .prepare(
      `SELECT a.*, l."displayName" AS "learnerName", i."name" AS "institutionName"
       FROM "applications" a
       JOIN "learners" l ON l."id" = a."learnerId"
       JOIN "institutions" i ON i."id" = a."institutionId"
       WHERE a."status" IN (${marks})
       ORDER BY a."updatedAt" DESC`
    )
    .all(...statuses) as Array<Application & { learnerName: string; institutionName: string }>;
}

export function getApplication(id: string) {
  return getDb()
    .prepare(
      `SELECT a.*, l."displayName" AS "learnerName", l."ulid" AS "learnerUlid",
              l."id" AS "learnerRowId", i."name" AS "institutionName", i."esrRef"
       FROM "applications" a
       JOIN "learners" l ON l."id" = a."learnerId"
       JOIN "institutions" i ON i."id" = a."institutionId"
       WHERE a."id" = ?`
    )
    .get(id) as
    | (Application & {
        learnerName: string;
        learnerUlid: string | null;
        learnerRowId: string;
        institutionName: string;
        esrRef: string;
      })
    | undefined;
}

export function getApplicationForLearner(learnerId: string) {
  return getDb()
    .prepare(
      'SELECT * FROM "applications" WHERE "learnerId" = ? ORDER BY "createdAt" DESC LIMIT 1'
    )
    .get(learnerId) as Application | undefined;
}

export function submitApplication(entry: {
  learner: Learner;
  institutionId: string;
  form: Record<string, unknown>;
  documents: string[];
}): string {
  const db = getDb();
  const now = new Date().toISOString();
  const id = newId('app');
  db.prepare(
    `INSERT INTO "applications"
       ("id", "learnerId", "institutionId", "status", "form", "documents",
        "createdAt", "updatedAt")
     VALUES (?, ?, ?, 'submitted', ?, ?, ?, ?)`
  ).run(
    id,
    entry.learner.id,
    entry.institutionId,
    JSON.stringify(entry.form),
    JSON.stringify(entry.documents),
    now,
    now
  );
  audit({
    actorUserId: entry.learner.userId,
    actorRole: 'learner',
    action: 'application.submitted',
    subjectType: 'application',
    subjectId: id,
  });
  return id;
}

function setStatus(id: string, status: string) {
  getDb()
    .prepare('UPDATE "applications" SET "status" = ?, "updatedAt" = ? WHERE "id" = ?')
    .run(status, new Date().toISOString(), id);
}

/** The RFQ-required manual document review by the school officer. */
export function schoolValidate(appId: string, actor: { userId: string }) {
  const app = getApplication(appId);
  if (!app || app.status !== 'submitted') {
    throw new Error('The application is not awaiting review.');
  }
  setStatus(appId, 'school_validated');
  audit({
    actorUserId: actor.userId,
    actorRole: 'school_officer',
    action: 'application.documents_validated',
    subjectType: 'application',
    subjectId: appId,
    payload: { civilRegistryCheck: 'sandbox:passed' },
  });
}

/**
 * The registrar approval: generates the ULID, creates the authoritative
 * learner profile, and issues the Verifiable Student ID to the wallet.
 * Returns the credential offer URI for the learner's QR.
 */
export async function registrarApprove(
  appId: string,
  actor: { userId: string }
): Promise<void> {
  const app = getApplication(appId);
  if (!app || app.status !== 'school_validated') {
    throw new Error('The application is not awaiting a registrar decision.');
  }

  const db = getDb();
  const now = new Date().toISOString();
  const ulid = newUlid();

  db.prepare(
    'UPDATE "learners" SET "ulid" = ?, "updatedAt" = ? WHERE "id" = ?'
  ).run(ulid, now, app.learnerRowId);
  setStatus(appId, 'approved');

  audit({
    actorUserId: actor.userId,
    actorRole: 'registrar',
    action: 'application.approved',
    subjectType: 'application',
    subjectId: appId,
    payload: { ulid },
  });

  const form = JSON.parse(app.form) as Record<string, unknown>;
  // Pre-authorised code flow with a transaction code: the learner types this
  // PIN in the wallet when accepting the offer.
  const studentIdPin = String(randomInt(1000, 10000));
  const answer = await ows(
    'moe',
    'POST',
    '/v2/config/digital-wallet/openid/sdjwt/credential/issue',
    {
      issuanceMode: 'InTime',
      credentialDefinitionId: requiredEnv('STUDENT_ID_CREDENTIAL_ID', 'Student ID issuance'),
      urlScheme: 'openid-credential-offer://',
      userPin: studentIdPin,
      credential: {
        vct: 'VerifiableStudentID',
        claims: {
          id: ulid,
          identifier: ulid,
          firstName: String(form.firstName ?? app.learnerName.split(' ')[0] ?? ''),
          familyName: String(
            form.familyName ?? app.learnerName.split(' ').slice(1).join(' ') ?? ''
          ),
          commonName: app.learnerName,
          displayName: app.learnerName,
          dateOfBirth: String(form.dateOfBirth ?? ''),
          mail: String(form.email ?? ''),
          eduPersonPrincipalName: `${ulid.toLowerCase()}@nlr.gov.example`,
          eduPersonPrimaryAffiliation: 'student',
          eduPersonAffiliation: ['student', 'member'],
          eduPersonScopedAffiliation: ['student@riverside.school.example'],
          eduPersonAssurance: ['https://refeds.org/assurance/IAP/medium'],
          schacHomeOrganization: 'riverside.school.example',
          schacPersonalUniqueID: `urn:schac:personalUniqueID:example:ULID:${ulid}`,
          schacPersonalUniqueCode: [
            `urn:schac:personalUniqueCode:example:nlr:${ulid}`,
          ],
        },
      },
    }
  );

  const history = Array.isArray(answer?.credentialHistory)
    ? answer.credentialHistory[0]
    : answer?.credentialHistory;
  const exchangeId: string | undefined =
    history?.credentialExchangeId ?? history?.CredentialExchangeId;
  const offer: string | undefined = history?.credentialOffer;
  if (!exchangeId || !offer) {
    throw new Error('The wallet service did not return a credential offer.');
  }

  db.prepare(
    `INSERT INTO "credential_exchanges"
       ("id", "owsExchangeId", "direction", "credentialType", "learnerId",
        "applicationId", "status", "createdAt", "updatedAt")
     VALUES (?, ?, 'issuance', 'student-id', ?, ?, 'offer_sent', ?, ?)
     ON CONFLICT("owsExchangeId") DO NOTHING`
  ).run(newId('exc'), exchangeId, app.learnerRowId, appId, now, now);

  // The learner portal renders the offer as a QR until the wallet accepts it.
  db.prepare(
    'UPDATE "applications" SET "form" = ?, "updatedAt" = ? WHERE "id" = ?'
  ).run(
    JSON.stringify({
      ...form,
      studentIdOffer: offer,
      studentIdExchangeId: exchangeId,
      studentIdPin,
    }),
    now,
    appId
  );

  audit({
    actorUserId: actor.userId,
    actorRole: 'registrar',
    action: 'credential.student_id_offered',
    subjectType: 'exchange',
    subjectId: exchangeId,
    payload: { applicationId: appId },
  });
}

/** The school submits the signed graduation decision reference. */
export function submitGraduation(
  appId: string,
  decision: {
    programme: string;
    qualificationCode: string;
    result: string;
    decisionText: string;
  },
  actor: { userId: string }
) {
  const app = getApplication(appId);
  if (!app || app.status !== 'approved') {
    throw new Error('The application is not ready for a graduation decision.');
  }
  const docHash = createHash('sha256')
    .update(decision.decisionText)
    .digest('hex');
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `UPDATE "applications" SET
         "programme" = ?, "qualificationCode" = ?, "result" = ?,
         "graduationDocHash" = ?, "status" = 'graduation_submitted',
         "updatedAt" = ?
       WHERE "id" = ?`
    )
    .run(
      decision.programme,
      decision.qualificationCode,
      decision.result,
      docHash,
      now,
      appId
    );
  audit({
    actorUserId: actor.userId,
    actorRole: 'school_officer',
    action: 'graduation.submitted',
    subjectType: 'application',
    subjectId: appId,
    payload: {
      programme: decision.programme,
      qualificationCode: decision.qualificationCode,
      documentHash: docHash,
      institutionSignature: 'sandbox:tsp-signed',
    },
  });
}

/**
 * The Ministry processes a graduation decision: validates the institution
 * against the sandbox Education Service Registry and places the diploma
 * behind the fee. Payment is always required; the learner pays with the
 * wallet and receives the diploma in the same step.
 */
export async function moeProcessGraduation(
  appId: string,
  actor: { userId: string }
): Promise<'payment_pending'> {
  const app = getApplication(appId);
  if (!app || app.status !== 'graduation_submitted') {
    throw new Error('The application has no pending graduation decision.');
  }

  // Sandbox Education Service Registry check.
  if (!app.esrRef || !app.esrRef.startsWith('ESR-')) {
    throw new Error('The institution is not authorised in the Education Service Registry.');
  }
  audit({
    actorUserId: actor.userId,
    actorRole: 'registrar',
    action: 'graduation.institution_validated',
    subjectType: 'application',
    subjectId: appId,
    payload: { esrRef: app.esrRef, registry: 'sandbox' },
  });

  setStatus(appId, 'payment_pending');
  audit({
    actorUserId: actor.userId,
    actorRole: 'registrar',
    action: 'graduation.payment_required',
    subjectType: 'application',
    subjectId: appId,
  });
  return 'payment_pending';
}

/**
 * Start the paid diploma issuance as a DYNAMIC CREDENTIAL REQUEST: one QR.
 * The wallet first presents the chosen TS12 payment credential (account or
 * card) with the diploma-fee transaction data, and the diploma then issues
 * automatically in the same session. No user PIN: the protocol forbids one
 * on a dynamic request.
 */
export async function startDiplomaPaymentIssuance(
  appId: string,
  actor: { userId: string },
  method: 'account' | 'card' = 'account'
): Promise<{ exchangeId: string; qrUri: string }> {
  const app = getApplication(appId);
  if (!app || app.status !== 'payment_pending') {
    throw new Error('No payment is due for this application.');
  }

  const answer = await ows(
    'moe',
    'POST',
    '/v2/config/digital-wallet/openid/sdjwt/credential/issue',
    {
      issuanceMode: 'InTime',
      credentialDefinitionId: requiredEnv('DIPLOMA_CREDENTIAL_ID', 'Diploma issuance'),
      urlScheme: 'openid-credential-offer://',
      // Presentation during issuance: the payment credential of the chosen
      // method must be presented before the diploma is released.
      presentationDefinitionId: requiredEnv(
        method === 'card'
          ? 'PAYMENT_CARD_PRESENTATION_DEFINITION_ID'
          : 'PAYMENT_PRESENTATION_DEFINITION_ID',
        'Payment confirmation'
      ),
      // The TS12 payment transaction data lives under `payload`, the shape
      // the platform validates (see the demonstrators' checkout).
      transactionData: {
        payload: {
          transaction_id: appId.slice(0, 36),
          date_time: new Date().toISOString(),
          payee: { name: 'Ministry of Education', id: 'ESR-MOE-0001' },
          execution_date: new Date().toISOString().slice(0, 10),
          currency: 'EUR',
          amount: 50,
        },
      },
      credential: {
        vct: 'urn:education:diploma:1',
        claims: {
          learnerName: app.learnerName,
          qualificationName: app.programme ?? '',
          qualificationCode: app.qualificationCode ?? '',
          awardingInstitution: app.institutionName,
          awardDate: new Date().toISOString().slice(0, 10),
          programme: app.programme ?? '',
          result: app.result ?? '',
          ulid: app.learnerUlid ?? '',
          graduationDecisionHash: app.graduationDocHash ?? '',
        },
      },
    }
  );

  const history = Array.isArray(answer?.credentialHistory)
    ? answer.credentialHistory[0]
    : answer?.credentialHistory;
  const exchangeId: string | undefined =
    history?.credentialExchangeId ?? history?.CredentialExchangeId;
  const qrUri: string | undefined = history?.credentialOffer;
  if (!exchangeId || !qrUri) {
    throw new Error('The wallet service could not start the paid issuance.');
  }

  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO "credential_exchanges"
       ("id", "owsExchangeId", "direction", "credentialType", "learnerId",
        "applicationId", "status", "createdAt", "updatedAt")
     VALUES (?, ?, 'issuance', 'diploma', ?, ?, 'offer_sent', ?, ?)
     ON CONFLICT("owsExchangeId") DO NOTHING`
  ).run(newId('exc'), exchangeId, app.learnerRowId, appId, now, now);

  const form = JSON.parse(app.form) as Record<string, unknown>;
  db.prepare(
    'UPDATE "applications" SET "form" = ?, "updatedAt" = ? WHERE "id" = ?'
  ).run(
    JSON.stringify({
      ...form,
      diplomaOffer: qrUri,
      diplomaExchangeId: exchangeId,
      paymentMethod: method,
    }),
    now,
    appId
  );

  audit({
    actorUserId: actor.userId,
    actorRole: 'learner',
    action: 'payment.dynamic_issuance_started',
    subjectType: 'exchange',
    subjectId: exchangeId,
    payload: { applicationId: appId, amount: 50, currency: 'EUR', method },
  });

  return { exchangeId, qrUri };
}

/**
 * Webhook completion for the dynamic paid issuance: when the wallet has the
 * diploma (the payment presentation succeeded inside the same exchange),
 * record the simulated ledger entry and close the application.
 */
export function completeDynamicDiplomaPayment(
  credentialExchangeId: string
): boolean {
  const db = getDb();
  const exchange = db
    .prepare(
      `SELECT "applicationId" FROM "credential_exchanges"
       WHERE "owsExchangeId" = ? AND "credentialType" = 'diploma'`
    )
    .get(credentialExchangeId) as { applicationId: string } | undefined;
  if (!exchange?.applicationId) return false;

  const app = getApplication(exchange.applicationId);
  if (!app || app.status !== 'payment_pending') return false;

  const now = new Date().toISOString();
  const ledgerRef = `LEDGER-${newId('pay').slice(4, 16)}`;
  db.prepare(
    `UPDATE "applications" SET "paymentExchangeId" = ?, "paymentLedgerRef" = ?,
       "status" = 'issued', "updatedAt" = ? WHERE "id" = ?`
  ).run(credentialExchangeId, ledgerRef, now, exchange.applicationId);

  audit({
    actorUserId: null,
    actorRole: 'system',
    action: 'payment.confirmed',
    subjectType: 'application',
    subjectId: exchange.applicationId,
    payload: { credentialExchangeId, ledgerRef, ledger: 'sandbox' },
  });
  audit({
    actorUserId: null,
    actorRole: 'system',
    action: 'credential.diploma_delivered',
    subjectType: 'exchange',
    subjectId: credentialExchangeId,
    payload: { applicationId: exchange.applicationId },
  });

  return true;
}

/** True when the wallet has accepted the credential of this exchange. */
export function isExchangeAccepted(owsExchangeId: string): boolean {
  const row = getDb()
    .prepare(
      'SELECT "status" FROM "credential_exchanges" WHERE "owsExchangeId" = ?'
    )
    .get(owsExchangeId) as { status: string } | undefined;
  return (
    row?.status === 'openid.credential.credential_accepted' ||
    row?.status === 'openid.credential.credential_acked'
  );
}

/** The diploma exchange for an application, if one exists. */
export function getDiplomaExchange(appId: string) {
  return getDb()
    .prepare(
      `SELECT * FROM "credential_exchanges"
       WHERE "applicationId" = ? AND "credentialType" = 'diploma'
       ORDER BY "createdAt" DESC LIMIT 1`
    )
    .get(appId) as
    | { owsExchangeId: string; revoked: number; revokedAt: string | null }
    | undefined;
}

/**
 * Permanently revoke an issued diploma by its credential exchange id.
 * A fresh employer verification must reject the credential afterwards.
 */
export async function revokeDiploma(
  appId: string,
  actor: { userId: string }
): Promise<void> {
  const exchange = getDiplomaExchange(appId);
  if (!exchange) throw new Error('No issued diploma for this application.');
  if (exchange.revoked) throw new Error('The diploma is already revoked.');

  await ows(
    'moe',
    'PUT',
    `/v2/config/digital-wallet/openid/sdjwt/credential/history/${exchange.owsExchangeId}/revocation-status`,
    { revocationStatus: 'Revoked' }
  );

  const now = new Date().toISOString();
  getDb()
    .prepare(
      `UPDATE "credential_exchanges" SET "revoked" = 1, "revokedAt" = ?,
         "updatedAt" = ? WHERE "owsExchangeId" = ?`
    )
    .run(now, now, exchange.owsExchangeId);

  audit({
    actorUserId: actor.userId,
    actorRole: 'registrar',
    action: 'credential.diploma_revoked',
    subjectType: 'exchange',
    subjectId: exchange.owsExchangeId,
    payload: { applicationId: appId },
  });
}
