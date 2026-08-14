'use server';

import { getDb } from '@/lib/db';
import { newId } from '@/lib/ids';
import { audit } from '@/lib/audit';
import { ows, requiredEnv } from '@/lib/ows';
import { readVerification, type VerificationResult } from '@/lib/verification';

/**
 * The candidate's application, public by design (the candidate is an
 * anonymous visitor). One wallet request asks for the PID (to fill the
 * personal fields) and the diploma (the qualification evidence); the
 * candidate reviews the filled form and submits when satisfied.
 */

export async function startApplicationRequest(): Promise<{
  exchangeId: string;
  qrUri: string;
}> {
  const answer = await ows(
    'civicworks',
    'POST',
    '/v3/config/digital-wallet/openid/sdjwt/verification/send',
    {
      presentationDefinitionId: requiredEnv(
        'DIPLOMA_PRESENTATION_DEFINITION_ID',
        'Job application'
      ),
      // By reference: the QR carries a request_uri, not the whole request.
      requestByReference: true,
    }
  );

  const history = answer?.verificationHistory ?? answer;
  const exchangeId: string | undefined = history?.presentationExchangeId;
  const qrUri: string | undefined = history?.vpTokenQrCode;
  if (!exchangeId || !qrUri) {
    throw new Error('The wallet service could not start the request.');
  }

  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO "credential_exchanges"
         ("id", "owsExchangeId", "direction", "credentialType", "status",
          "createdAt", "updatedAt")
       VALUES (?, ?, 'presentation', 'diploma-verify', 'request_sent', ?, ?)
       ON CONFLICT("owsExchangeId") DO NOTHING`
    )
    .run(newId('exc'), exchangeId, now, now);

  audit({
    actorUserId: null,
    actorRole: 'candidate',
    action: 'verification.requested',
    subjectType: 'exchange',
    subjectId: exchangeId,
    payload: {
      requestedClaims: [
        'given_name',
        'family_name',
        'email',
        'learnerName',
        'qualificationName',
        'qualificationCode',
        'awardingInstitution',
        'awardDate',
      ],
    },
  });

  return { exchangeId, qrUri };
}

/** Read the finished presentation so the form can be filled for review. */
export async function readApplicationData(
  exchangeId: string
): Promise<VerificationResult | null> {
  return readVerification(exchangeId);
}

/**
 * The final submission, after the candidate reviewed the form. The success
 * screen is generic on purpose: no submitted data is echoed back.
 */
export async function submitJobApplication(entry: {
  jobSlug: string;
  evidence: 'wallet' | 'pdf';
  exchangeId?: string;
}): Promise<{ ok: boolean }> {
  audit({
    actorUserId: null,
    actorRole: 'candidate',
    action: 'job.application_submitted',
    subjectType: 'job',
    subjectId: entry.jobSlug,
    payload: {
      evidence: entry.evidence,
      ...(entry.exchangeId ? { presentationExchangeId: entry.exchangeId } : {}),
    },
  });
  return { ok: true };
}
