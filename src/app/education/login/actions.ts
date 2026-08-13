'use server';

import { getDb } from '@/lib/db';
import { newId } from '@/lib/ids';
import { ows, requiredEnv } from '@/lib/ows';

/**
 * Start a PID wallet login: send the OpenID4VP request from the Ministry
 * sandbox, record the exchange as kind 'pid-login' so the webhook knows to
 * mint a login token, and hand the QR content to the browser.
 */
export async function startPidLogin(): Promise<{
  exchangeId: string;
  qrUri: string;
}> {
  const presentationDefinitionId = requiredEnv(
    'PID_PRESENTATION_DEFINITION_ID',
    'PID login'
  );

  const answer = await ows(
    'moe',
    'POST',
    '/v3/config/digital-wallet/openid/sdjwt/verification/send',
    { presentationDefinitionId }
  );

  const history = answer?.verificationHistory ?? answer;
  const exchangeId: string | undefined = history?.presentationExchangeId;
  const qrUri: string | undefined = history?.vpTokenQrCode;
  if (!exchangeId || !qrUri) {
    throw new Error('The wallet service could not start the sign-in.');
  }

  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO "credential_exchanges"
         ("id", "owsExchangeId", "direction", "credentialType", "status",
          "createdAt", "updatedAt")
       VALUES (?, ?, 'presentation', 'pid-login', 'request_sent', ?, ?)
       ON CONFLICT("owsExchangeId") DO NOTHING`
    )
    .run(newId('exc'), exchangeId, now, now);

  return { exchangeId, qrUri };
}
