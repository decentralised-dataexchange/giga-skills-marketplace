'use server';

import { requireRole } from '@/lib/guards';
import { getDb } from '@/lib/db';
import { newId } from '@/lib/ids';
import { audit } from '@/lib/audit';
import { ows, requiredEnv } from '@/lib/ows';

/**
 * Start a diploma verification from the CivicWorks sandbox: five claims
 * only (name, qualification, institution, code, award date), nothing else.
 */
export async function startDiplomaVerification(): Promise<{
  exchangeId: string;
  qrUri: string;
}> {
  const session = await requireRole('employer_verifier');

  const answer = await ows(
    'civicworks',
    'POST',
    '/v3/config/digital-wallet/openid/sdjwt/verification/send',
    {
      presentationDefinitionId: requiredEnv(
        'DIPLOMA_PRESENTATION_DEFINITION_ID',
        'Diploma verification'
      ),
      // By reference: the QR carries a request_uri, not the whole request.
      requestByReference: true,
    }
  );

  const history = answer?.verificationHistory ?? answer;
  const exchangeId: string | undefined = history?.presentationExchangeId;
  const qrUri: string | undefined = history?.vpTokenQrCode;
  if (!exchangeId || !qrUri) {
    throw new Error('The wallet service could not start the verification.');
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
    actorUserId: session.user.id,
    actorRole: 'employer_verifier',
    action: 'verification.requested',
    subjectType: 'exchange',
    subjectId: exchangeId,
    payload: {
      requestedClaims: [
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
