import { getDb } from '@/lib/db';
import { verifySignature } from '@/lib/webhook/verify';
import { extractExchangeId, isSupportedTopic } from '@/lib/webhook/topics';
import { storeEvent } from '@/lib/webhook/store';
import { completePidLogin } from '@/lib/wallet-login';

// Unauthenticated POST from iGrant.io; HMAC is the authentication.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SECRET_ENV: Record<string, string> = {
  moe: 'MOE_WEBHOOK_SECRET',
  civicworks: 'CIVICWORKS_WEBHOOK_SECRET',
};

/**
 * POST /api/webhooks/ows/{org} - receive an OWS digital-wallet webhook.
 *
 * Verifies the per-org HMAC over the raw body, maps the topic to its exchange
 * id, runs any server-side completion work (the PID login mint), and stores
 * the event for SSE/polling. Duplicate deliveries are idempotent; unknown
 * topics are 400; a bad signature is 401.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ org: string }> }
) {
  const { org } = await ctx.params;
  const secretEnv = SECRET_ENV[org];
  if (!secretEnv) return Response.json({ error: 'Unknown receiver' }, { status: 404 });

  const rawBody = await req.text();
  const signature = req.headers.get('x-igrant-signature');
  const secret = process.env[secretEnv] ?? '';

  if (!verifySignature(signature, rawBody, secret)) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let envelope: {
    deliveryID?: string;
    type?: string;
    data?: Record<string, unknown>;
  };
  try {
    envelope = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const topic = envelope.type;
  if (!isSupportedTopic(topic)) {
    return Response.json({ error: 'Unsupported topic' }, { status: 400 });
  }

  const exchangeId = extractExchangeId(topic, envelope.data ?? {});
  if (!exchangeId) {
    return Response.json({ error: 'No exchange id' }, { status: 400 });
  }

  const deliveryId =
    envelope.deliveryID ?? `${topic}:${exchangeId}:${rawBody.length}`;

  const payload: Record<string, unknown> = { topic, org };

  // Update the local exchange status and run completion work by exchange kind.
  const db = getDb();
  const exchange = db
    .prepare(
      'SELECT "credentialType" FROM "credential_exchanges" WHERE "owsExchangeId" = ?'
    )
    .get(exchangeId) as { credentialType: string } | undefined;

  db.prepare(
    'UPDATE "credential_exchanges" SET "status" = ?, "updatedAt" = ? WHERE "owsExchangeId" = ?'
  ).run(topic, new Date().toISOString(), exchangeId);

  const isPresentationDone =
    topic === 'digitalwallet.presentation.verified' ||
    topic === 'openid.presentation.presentation_acked.v3';

  if (exchange?.credentialType === 'pid-login' && isPresentationDone) {
    try {
      const result = await completePidLogin(exchangeId);
      if (result) {
        payload.status = 'verified';
        payload.loginToken = result.loginToken;
        payload.displayName = result.displayName;
      } else {
        payload.status = 'rejected';
      }
    } catch (error) {
      console.error('[Webhook] PID login completion failed:', error);
      payload.status = 'error';
    }
  }

  storeEvent({ deliveryId, owsExchangeId: exchangeId, topic, payload });

  return Response.json({ received: true });
}
