import 'server-only';

import { createHmac, randomBytes, createHash } from 'crypto';

import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { newId } from '@/lib/ids';
import { audit } from '@/lib/audit';
import { ows, owsLog } from '@/lib/ows';

/**
 * The learner wallet login, server side.
 *
 * When the Ministry sandbox webhook reports a finished PID presentation, this
 * module reads the verification record from OWS, checks `verified === true`,
 * derives a pairwise pseudonym from stable PID claims (an HMAC with a server
 * pepper; no raw PID attribute is stored), upserts the learner user, and
 * mints a one-time login token. SSE pushes the token to the browser, which
 * exchanges it at /api/auth/wallet/sign-in for a session cookie.
 */

type PidClaims = {
  givenName: string;
  familyName: string;
  birthdate: string;
  email: string;
  address: string;
};

function claimString(source: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value) return value;
  }
  return '';
}

/** One readable line out of the PID address object. */
function formatAddress(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  const address = value as Record<string, unknown>;
  return ['street_address', 'locality', 'region', 'postal_code', 'country']
    .map((part) => address[part])
    .filter((part): part is string => typeof part === 'string' && part !== '')
    .join(', ');
}

/** Pull the PID claims out of the disclosed presentation array. */
export function extractPidClaims(presentation: unknown): PidClaims | null {
  const items = Array.isArray(presentation) ? presentation : [presentation];
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const claims = item as Record<string, unknown>;
    const givenName = claimString(claims, ['given_name', 'givenName']);
    const familyName = claimString(claims, ['family_name', 'familyName']);
    const birthdate = claimString(claims, ['birthdate', 'birth_date']);
    const email = claimString(claims, ['email', 'email_address']);
    const address = formatAddress(claims.address ?? claims.resident_address);
    if (givenName || familyName) {
      return { givenName, familyName, birthdate, email, address };
    }
  }
  return null;
}

/** Pairwise pseudonym: HMAC of the stable claims with a server pepper. */
function pseudonym(claims: PidClaims): string {
  const pepper = process.env.LEARNER_PSEUDONYM_PEPPER || '';
  return createHmac('sha256', pepper)
    .update([claims.givenName, claims.familyName, claims.birthdate].join('|'))
    .digest('hex');
}

/**
 * Complete a PID login exchange: check the OWS record, upsert the learner,
 * mint a token. Returns the token, or null when the presentation did not
 * verify. Safe to call more than once per exchange (webhooks redeliver).
 */
export async function completePidLogin(
  presentationExchangeId: string
): Promise<{ loginToken: string; displayName: string } | null> {
  const record = await ows(
    'moe',
    'GET',
    `/v3/config/digital-wallet/openid/sdjwt/verification/history/${presentationExchangeId}`
  );

  const history = record?.verificationHistory ?? record;
  if (history?.verified !== true) {
    owsLog('warn', `PID login ${presentationExchangeId}: not verified`);
    return null;
  }

  const claims = extractPidClaims(history.presentation);
  if (!claims) {
    owsLog('warn', `PID login ${presentationExchangeId}: no usable claims`);
    return null;
  }

  const db = getDb();
  const now = new Date().toISOString();
  const pseud = pseudonym(claims);
  const displayName = [claims.givenName, claims.familyName]
    .filter(Boolean)
    .join(' ');

  // Transient form prefill: confirmed by the learner on the form, cleared at
  // submission, never part of the registry record.
  const prefill = JSON.stringify({
    dateOfBirth: claims.birthdate,
    email: claims.email,
    address: claims.address,
  });

  // Find or create the Better Auth user + learner row for this pseudonym.
  let learner = db
    .prepare('SELECT "id", "userId" FROM "learners" WHERE "pseudonym" = ?')
    .get(pseud) as { id: string; userId: string } | undefined;

  if (!learner) {
    // A synthetic, non-routable address derived from the pseudonym keeps the
    // Better Auth email column unique without storing any PID attribute.
    const email = `learner-${pseud.slice(0, 16)}@wallet.invalid`;
    const password = randomBytes(24).toString('base64url');
    const created = await auth.api.createUser({
      body: {
        email,
        password,
        name: displayName || 'Learner',
        role: 'learner' as 'user',
      },
    });
    const userId = created.user.id;
    const learnerId = newId('lrn');
    db.prepare(
      `INSERT INTO "learners"
         ("id", "userId", "pseudonym", "displayName", "prefill",
          "createdAt", "updatedAt")
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(learnerId, userId, pseud, displayName || 'Learner', prefill, now, now);
    learner = { id: learnerId, userId };

    audit({
      actorUserId: userId,
      actorRole: 'learner',
      action: 'learner.identified',
      subjectType: 'learner',
      subjectId: learnerId,
      payload: { presentationExchangeId },
    });
  } else {
    // A returning learner refreshes the transient prefill.
    db.prepare(
      'UPDATE "learners" SET "prefill" = ?, "updatedAt" = ? WHERE "id" = ?'
    ).run(prefill, now, learner.id);
  }

  const loginToken = randomBytes(32).toString('base64url');
  db.prepare(
    `INSERT INTO "login_tokens" ("token", "userId", "exchangeId", "expiresAt")
     VALUES (?, ?, ?, ?)`
  ).run(
    loginToken,
    learner.userId,
    presentationExchangeId,
    new Date(Date.now() + 2 * 60 * 1000).toISOString()
  );

  return { loginToken, displayName: displayName || 'Learner' };
}

/** Hash used to reference a verified presentation without storing claims. */
export function presentationRef(presentationExchangeId: string): string {
  return createHash('sha256').update(presentationExchangeId).digest('hex').slice(0, 24);
}
