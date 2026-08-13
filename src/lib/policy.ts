import 'server-only';

import { getDb } from '@/lib/db';
import { audit } from '@/lib/audit';

/**
 * Policy settings: the audit-logged toggles the Ministry sets in the back
 * office. In production these would come from a low-code configuration
 * service; the showcase keeps one simple, versionless key-value store and
 * writes every change to the audit log.
 */

export const PAYMENT_REQUIRED_KEY = 'requirePaymentBeforeIssuance';

export function getPolicy(key: string, fallback = 'false'): string {
  const row = getDb()
    .prepare('SELECT "value" FROM "policy_settings" WHERE "key" = ?')
    .get(key) as { value: string } | undefined;
  return row?.value ?? fallback;
}

export function setPolicy(
  key: string,
  value: string,
  actor: { userId: string; role: string }
): void {
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO "policy_settings" ("key", "value", "updatedBy", "updatedAt")
       VALUES (?, ?, ?, ?)
       ON CONFLICT("key") DO UPDATE SET
         "value" = excluded."value",
         "updatedBy" = excluded."updatedBy",
         "updatedAt" = excluded."updatedAt"`
    )
    .run(key, value, actor.userId, now);

  audit({
    actorUserId: actor.userId,
    actorRole: actor.role,
    action: 'policy.set',
    subjectType: 'policy',
    subjectId: key,
    payload: { value },
  });
}
