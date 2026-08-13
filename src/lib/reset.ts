import 'server-only';

import { getDb } from '@/lib/db';
import { PAYMENT_REQUIRED_KEY, setPolicy } from '@/lib/policy';

/**
 * The demo reset: wipe every journey artefact so the showcase starts clean.
 *
 * Removes learners and their wallet-created accounts, applications,
 * credential exchange records, webhook events, login tokens, consent
 * mappings (with a best-effort delete of the Consent BB records), the audit
 * log, and puts the payment policy back to its default. Staff accounts and
 * institutions stay, so the demo is immediately usable again.
 */
export async function resetDemoData(): Promise<void> {
  const db = getDb();

  // Best-effort remote cleanup: delete each learner's consent records in the
  // Consent Building Block before the local mapping disappears.
  const links = db
    .prepare('SELECT "individualId" FROM "consent_links"')
    .all() as Array<{ individualId: string }>;
  const key = process.env.IGRANT_API_KEY;
  const base = (process.env.IGRANT_BASE_URL ?? '').replace(/\/$/, '');
  if (key && base) {
    for (const link of links) {
      try {
        await fetch(`${base}/v2/service/individual/record`, {
          method: 'DELETE',
          headers: {
            Authorization: `ApiKey ${key}`,
            'X-ConsentBB-IndividualId': link.individualId,
          },
        });
      } catch {
        // The local reset proceeds regardless.
      }
    }
  }

  const wipe = db.transaction(() => {
    db.prepare('DELETE FROM "exchange_events"').run();
    db.prepare('DELETE FROM "login_tokens"').run();
    db.prepare('DELETE FROM "credential_exchanges"').run();
    db.prepare('DELETE FROM "applications"').run();
    db.prepare('DELETE FROM "consent_links"').run();
    db.prepare('DELETE FROM "learners"').run();
    // Wallet-created learner accounts; sessions and accounts cascade.
    db.prepare(`DELETE FROM "user" WHERE "role" = 'learner'`).run();

    // The audit log is append-only behind triggers; lift them for the reset
    // and put them back, with the sequence starting from 1 again.
    db.exec('DROP TRIGGER IF EXISTS "audit_events_no_update"');
    db.exec('DROP TRIGGER IF EXISTS "audit_events_no_delete"');
    db.prepare('DELETE FROM "audit_events"').run();
    db.prepare(`DELETE FROM "sqlite_sequence" WHERE "name" = 'audit_events'`).run();
    db.exec(`
      CREATE TRIGGER IF NOT EXISTS "audit_events_no_update"
        BEFORE UPDATE ON "audit_events"
        BEGIN SELECT RAISE(ABORT, 'audit_events is append-only'); END;
      CREATE TRIGGER IF NOT EXISTS "audit_events_no_delete"
        BEFORE DELETE ON "audit_events"
        BEGIN SELECT RAISE(ABORT, 'audit_events is append-only'); END;
    `);

    db.prepare('DELETE FROM "policy_settings"').run();
  });
  wipe();

  setPolicy(PAYMENT_REQUIRED_KEY, 'false', { userId: 'reset', role: 'seed' });
}
