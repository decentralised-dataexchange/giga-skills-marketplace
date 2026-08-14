import Database from 'better-sqlite3';

/**
 * The showcase database: local SQLite, following the demonstrators pattern.
 *
 * It holds the Better Auth tables, the prototype registries (learners,
 * institutions, applications), credential exchange correlation, consent links,
 * policy settings, the webhook event store, one-time wallet login tokens and
 * the append-only audit log. Credentials themselves live in the learner's
 * wallet and in OWS; this database never stores credential material or raw PID
 * attributes.
 */

const DB_PATH = process.env.SQLITE_PATH || './sqlite.db';

const g = globalThis as typeof globalThis & { __eduDb?: Database.Database };

function open(): Database.Database {
  // `timeout` sets SQLite's busy timeout. Next.js collects page data in
  // parallel workers at build time, so several processes can open this file at
  // once; without a busy timeout the losers fail immediately with SQLITE_BUSY.
  const db = new Database(DB_PATH, { timeout: 10_000 });

  try {
    db.pragma('journal_mode = WAL');
  } catch {
    // Another process is setting it; the mode applies to us as well.
  }

  db.exec(`
    -- Better Auth core tables. The admin plugin adds role/ban fields on user.
    CREATE TABLE IF NOT EXISTS "user" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "email" TEXT NOT NULL UNIQUE,
      "emailVerified" INTEGER NOT NULL DEFAULT 0,
      "image" TEXT,
      "role" TEXT,
      "banned" INTEGER,
      "banReason" TEXT,
      "banExpires" DATE,
      "createdAt" DATE NOT NULL,
      "updatedAt" DATE NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "session" (
      "id" TEXT PRIMARY KEY,
      "expiresAt" DATE NOT NULL,
      "token" TEXT NOT NULL UNIQUE,
      "createdAt" DATE NOT NULL,
      "updatedAt" DATE NOT NULL,
      "ipAddress" TEXT,
      "userAgent" TEXT,
      "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
      "impersonatedBy" TEXT
    );
    CREATE TABLE IF NOT EXISTS "account" (
      "id" TEXT PRIMARY KEY,
      "accountId" TEXT NOT NULL,
      "providerId" TEXT NOT NULL,
      "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
      "accessToken" TEXT,
      "refreshToken" TEXT,
      "idToken" TEXT,
      "accessTokenExpiresAt" DATE,
      "refreshTokenExpiresAt" DATE,
      "scope" TEXT,
      "password" TEXT,
      "createdAt" DATE NOT NULL,
      "updatedAt" DATE NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "verification" (
      "id" TEXT PRIMARY KEY,
      "identifier" TEXT NOT NULL,
      "value" TEXT NOT NULL,
      "expiresAt" DATE NOT NULL,
      "createdAt" DATE NOT NULL,
      "updatedAt" DATE NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session"("userId");
    CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account"("userId");
    CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification"("identifier");

    -- Education Service Registry entries and the demo employer.
    CREATE TABLE IF NOT EXISTS "institutions" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "kind" TEXT NOT NULL,             -- school | ministry | employer
      "esrRef" TEXT NOT NULL,           -- reference in the sandbox Education Service Registry
      "createdAt" TEXT NOT NULL
    );

    -- The National Learner Registry (prototype system of record).
    -- No PID attribute is stored: the pseudonym is an HMAC of stable PID
    -- claims with a server-side pepper, and displayName is what the learner
    -- confirmed on the registration form.
    CREATE TABLE IF NOT EXISTS "learners" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL UNIQUE REFERENCES "user"("id") ON DELETE CASCADE,
      "pseudonym" TEXT NOT NULL UNIQUE,
      "displayName" TEXT NOT NULL,
      "ulid" TEXT UNIQUE,               -- set at MoE approval
      "createdAt" TEXT NOT NULL,
      "updatedAt" TEXT NOT NULL
    );

    -- Registration and enrolment applications.
    CREATE TABLE IF NOT EXISTS "applications" (
      "id" TEXT PRIMARY KEY,
      "learnerId" TEXT NOT NULL REFERENCES "learners"("id") ON DELETE CASCADE,
      "institutionId" TEXT NOT NULL REFERENCES "institutions"("id"),
      "status" TEXT NOT NULL,           -- draft | submitted | under_review | approved |
                                        -- graduation_submitted | payment_pending | issued
      "form" TEXT NOT NULL,             -- JSON: the registration form as confirmed
      "documents" TEXT NOT NULL DEFAULT '[]',   -- JSON: uploaded document references
      "programme" TEXT,
      "qualificationCode" TEXT,
      "result" TEXT,
      "graduationDocHash" TEXT,         -- SHA-256 of the institution-signed decision
      "paymentExchangeId" TEXT,         -- TS12 presentation that confirmed payment
      "paymentLedgerRef" TEXT,          -- simulated ledger entry
      "createdAt" TEXT NOT NULL,
      "updatedAt" TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "applications_learner_idx" ON "applications"("learnerId");
    CREATE INDEX IF NOT EXISTS "applications_status_idx" ON "applications"("status");

    -- Correlation between OWS exchanges and local records.
    CREATE TABLE IF NOT EXISTS "credential_exchanges" (
      "id" TEXT PRIMARY KEY,
      "owsExchangeId" TEXT NOT NULL UNIQUE,
      "direction" TEXT NOT NULL,        -- issuance | presentation
      "credentialType" TEXT NOT NULL,   -- pid-login | student-id | diploma | payment | diploma-verify
      "learnerId" TEXT,
      "applicationId" TEXT,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "revoked" INTEGER NOT NULL DEFAULT 0,
      "revokedAt" TEXT,
      "createdAt" TEXT NOT NULL,
      "updatedAt" TEXT NOT NULL
    );

    -- Mapping to the Consent BB individual. Server-side only; never rendered.
    CREATE TABLE IF NOT EXISTS "consent_links" (
      "learnerId" TEXT PRIMARY KEY REFERENCES "learners"("id") ON DELETE CASCADE,
      "individualId" TEXT NOT NULL,
      "createdAt" TEXT NOT NULL
    );

    -- Audit-logged policy toggles set in the Ministry back office.
    CREATE TABLE IF NOT EXISTS "policy_settings" (
      "key" TEXT PRIMARY KEY,
      "value" TEXT NOT NULL,
      "updatedBy" TEXT NOT NULL,
      "updatedAt" TEXT NOT NULL
    );

    -- Webhook event store: consumed by SSE and the polling fallback.
    CREATE TABLE IF NOT EXISTS "exchange_events" (
      "deliveryId" TEXT PRIMARY KEY,
      "owsExchangeId" TEXT NOT NULL,
      "topic" TEXT NOT NULL,
      "payload" TEXT NOT NULL,
      "createdAt" TEXT NOT NULL,
      "expiresAt" TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "exchange_events_exchange_idx" ON "exchange_events"("owsExchangeId");

    -- One-time wallet login tokens minted after a verified PID presentation.
    CREATE TABLE IF NOT EXISTS "login_tokens" (
      "token" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "exchangeId" TEXT NOT NULL,
      "expiresAt" TEXT NOT NULL,
      "usedAt" TEXT
    );

    -- Append-only audit log with a SHA-256 hash chain.
    CREATE TABLE IF NOT EXISTS "audit_events" (
      "seq" INTEGER PRIMARY KEY AUTOINCREMENT,
      "id" TEXT NOT NULL UNIQUE,
      "actorUserId" TEXT,
      "actorRole" TEXT NOT NULL,
      "action" TEXT NOT NULL,
      "subjectType" TEXT NOT NULL,
      "subjectId" TEXT NOT NULL,
      "payload" TEXT NOT NULL DEFAULT '{}',
      "prevHash" TEXT NOT NULL,
      "hash" TEXT NOT NULL,
      "createdAt" TEXT NOT NULL
    );
    CREATE TRIGGER IF NOT EXISTS "audit_events_no_update"
      BEFORE UPDATE ON "audit_events"
      BEGIN SELECT RAISE(ABORT, 'audit_events is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS "audit_events_no_delete"
      BEFORE DELETE ON "audit_events"
      BEGIN SELECT RAISE(ABORT, 'audit_events is append-only'); END;
  `);

  migrate(db);
  return db;
}

/**
 * Columns added after a database was first created. SQLite has no
 * ADD COLUMN IF NOT EXISTS, so each statement is attempted and a "duplicate
 * column" error means the work is already done.
 */
function migrate(db: Database.Database): void {
  const statements: string[] = [
    // Transient PID prefill for the registration form (date of birth, email,
    // address). Written at wallet sign-in, cleared when the application is
    // submitted; never part of the registry record itself.
    `ALTER TABLE "learners" ADD COLUMN "prefill" TEXT`,
  ];

  for (const statement of statements) {
    try {
      db.exec(statement);
    } catch {
      // The column is already there.
    }
  }
}

let migratedThisLoad = false;

export function getDb(): Database.Database {
  if (!g.__eduDb) g.__eduDb = open();
  else if (!migratedThisLoad) migrate(g.__eduDb);

  migratedThisLoad = true;
  return g.__eduDb;
}
