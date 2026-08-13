import 'server-only';

import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { newId } from '@/lib/ids';
import { PAYMENT_REQUIRED_KEY, getPolicy, setPolicy } from '@/lib/policy';
import { DEMO_ACCOUNTS } from '@/lib/demo-accounts';

/**
 * Idempotent demo seed: the four staff accounts, the fictional institutions
 * and the default policy state. Runs once per process, guarded by a promise on
 * globalThis, and skips anything that already exists, so restarts and
 * hot-reloads never duplicate data.
 */

const STAFF = Object.values(DEMO_ACCOUNTS);

const INSTITUTIONS = [
  { name: 'Riverside Secondary School', kind: 'school', esrRef: 'ESR-SCH-0042' },
  { name: 'Ministry of Education', kind: 'ministry', esrRef: 'ESR-MOE-0001' },
  { name: 'CivicWorks AB', kind: 'employer', esrRef: 'ESR-EMP-0117' },
];

async function seed(): Promise<void> {
  const db = getDb();

  for (const staff of STAFF) {
    const existing = db
      .prepare('SELECT "id" FROM "user" WHERE "email" = ?')
      .get(staff.email);
    if (existing) continue;

    await auth.api.createUser({
      body: {
        email: staff.email,
        password: staff.password,
        name: staff.name,
        role: staff.role as 'user',
      },
    });
  }

  const now = new Date().toISOString();
  for (const inst of INSTITUTIONS) {
    const existing = db
      .prepare('SELECT "id" FROM "institutions" WHERE "esrRef" = ?')
      .get(inst.esrRef);
    if (existing) continue;
    db.prepare(
      `INSERT INTO "institutions" ("id", "name", "kind", "esrRef", "createdAt")
       VALUES (?, ?, ?, ?, ?)`
    ).run(newId('ins'), inst.name, inst.kind, inst.esrRef, now);
  }

  // Default policy: payment not required until the demo turns it on.
  if (getPolicy(PAYMENT_REQUIRED_KEY, '') === '') {
    const registrar = db
      .prepare('SELECT "id" FROM "user" WHERE "email" = ?')
      .get('registrar@moe.gov') as { id: string } | undefined;
    setPolicy(PAYMENT_REQUIRED_KEY, 'false', {
      userId: registrar?.id ?? 'seed',
      role: 'seed',
    });
  }
}

const g = globalThis as typeof globalThis & { __eduSeed?: Promise<void> };

export function ensureSeeded(): Promise<void> {
  if (!g.__eduSeed) {
    g.__eduSeed = seed().catch((error) => {
      console.error('[Seed] failed:', error);
      g.__eduSeed = undefined;
      throw error;
    });
  }
  return g.__eduSeed;
}
