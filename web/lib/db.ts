// PostgreSQL access: postgres.js client, schema bootstrap, seed-on-empty, audit log.
// Connection comes from the standard PG* env vars; database defaults to "govbuild".
import postgres from "postgres";

const DATABASE = process.env.PGDATABASE ?? "govbuild";
const DATABASE_URL = process.env.DATABASE_URL;
const configuredMax = Number(process.env.DB_MAX_CONNECTIONS ?? 10);
const max = Number.isInteger(configuredMax) && configuredMax >= 2 ? configuredMax : 10;

// postgres.js speaks PostgreSQL's wire protocol; no SQLite/in-memory fallback is supported.
export const sql = DATABASE_URL
  ? postgres(DATABASE_URL, { max, onnotice: () => {} })
  : postgres({ database: DATABASE, max, onnotice: () => {} });

/** JSONB parameter helper; postgres.js json() has an overly narrow input type. */
export const json = (value: unknown) => sql.json(value as never);

// Every primary key is a UUID (gen_random_uuid(), built into PostgreSQL 13+),
// so identifiers are opaque and non-enumerable in URLs and API payloads.
// Because UUIDs carry no ordering, every "newest first" query orders on a
// timestamp column rather than on the id.
const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('provider','reviewer','superadmin')),
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  password_hash TEXT NOT NULL,
  settings      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS tokens (
  token      TEXT PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS orgs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  website        TEXT,
  description    TEXT,
  contact        TEXT,
  owner_id       UUID NOT NULL REFERENCES users(id),
  status         TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending','approved','rejected','suspended')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at     TIMESTAMPTZ,
  decided_by     UUID REFERENCES users(id),
  decision_notes TEXT
);
CREATE TABLE IF NOT EXISTS skills (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                 TEXT UNIQUE NOT NULL,
  org_id               UUID NOT NULL REFERENCES orgs(id),
  status               TEXT NOT NULL DEFAULT 'in_submission',
  official             BOOLEAN NOT NULL DEFAULT false,
  published_version_id UUID,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS versions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id     UUID NOT NULL REFERENCES skills(id),
  version      TEXT NOT NULL,
  manifest     JSONB,
  files        JSONB NOT NULL,
  checks       JSONB NOT NULL DEFAULT '[]',
  status       TEXT NOT NULL,
  submitted_by UUID REFERENCES users(id),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewer_id  UUID REFERENCES users(id),
  review_notes TEXT,
  decided_at   TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS events (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type     TEXT NOT NULL,
  actor_id UUID REFERENCES users(id),
  subject  JSONB,
  detail   JSONB,
  at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE skills ADD COLUMN IF NOT EXISTS official BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS logo TEXT;
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS cover TEXT;
ALTER TABLE versions ADD COLUMN IF NOT EXISTS repo JSONB;
-- A superadmin can suspend an organisation; a database from before that
-- change carries a status constraint without the 'suspended' value.
ALTER TABLE orgs DROP CONSTRAINT IF EXISTS orgs_status_check;
ALTER TABLE orgs ADD CONSTRAINT orgs_status_check
  CHECK (status IN ('pending','approved','rejected','suspended'));
-- Organisation approval is gone (only skills are reviewed); registrations from
-- before that change stop waiting.
UPDATE orgs SET status = 'approved', decided_at = COALESCE(decided_at, now()) WHERE status = 'pending';
-- The builder (Developer) role is removed; accounts that still carry it from
-- an older database become providers, the only self-service role.
UPDATE users SET role = 'provider' WHERE role = 'builder';
-- Automated checks no longer gate review (the report is reviewer evidence);
-- submissions that were parked as checks_failed join the queue.
UPDATE versions SET status = 'submitted' WHERE status = 'checks_failed';
-- Use cases are removed as a catalog surface. An older database carries them
-- as skills rows with type='usecase'; delist them so they stay stored but
-- never resurface in the public catalog.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'skills' AND column_name = 'type'
  ) THEN
    UPDATE skills SET status = 'delisted' WHERE type = 'usecase' AND status <> 'delisted';
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orgs_slug ON orgs(slug);
CREATE INDEX IF NOT EXISTS idx_tokens_user ON tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_orgs_owner ON orgs(owner_id, created_at);
CREATE INDEX IF NOT EXISTS idx_skills_org ON skills(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_skills_status ON skills(status);
CREATE INDEX IF NOT EXISTS idx_versions_skill ON versions(skill_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_versions_status_submitted ON versions(status, submitted_at);
CREATE INDEX IF NOT EXISTS idx_events_at ON events(at DESC);
`;

let ready: Promise<void> | null = null;

/** Bootstrap schema and seed demo data exactly once per server process. */
export function ensureReady(): Promise<void> {
  ready ??= (async () => {
    await createDatabaseIfMissing();

    // Multiple web replicas can start together. A database-level lock prevents
    // concurrent schema bootstraps and duplicate demo seeding on a fresh deploy.
    const bootstrap = await sql.reserve();
    try {
      await bootstrap`SELECT pg_advisory_lock(7142026)`;
      // Databases created before UUID ids still carry SERIAL primary keys; the
      // migration is a no-op once they have been converted.
      const { migrateIntegerIdsToUuid } = await import("./migrations");
      if (await migrateIntegerIdsToUuid()) console.log("Migrated integer ids to UUIDs.");
      await sql.unsafe(SCHEMA);
      const { seedIfEmpty } = await import("./seed");
      if (await seedIfEmpty()) console.log("Seeded demo users, organisations, and skills.");
      await backfillOrgSlugs();
    } finally {
      await bootstrap`SELECT pg_advisory_unlock(7142026)`;
      bootstrap.release();
    }
  })();
  return ready;
}

// Give every organisation a unique URL-safe slug (used for the skills repo path
// and the install command). Runs each boot; only touches rows with a null slug.
async function backfillOrgSlugs(): Promise<void> {
  const { slugify, RESERVED_SLUGS } = await import("./utils");
  const missing = await sql`SELECT id, name FROM orgs WHERE slug IS NULL ORDER BY created_at`;
  if (!missing.length) return;
  const taken = new Set<string>([
    ...RESERVED_SLUGS,
    ...(await sql`SELECT slug FROM orgs WHERE slug IS NOT NULL`).map((r) => r.slug as string),
  ]);
  for (const org of missing) {
    const base = slugify(org.name);
    let slug = base;
    for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`;
    taken.add(slug);
    await sql`UPDATE orgs SET slug = ${slug} WHERE id = ${org.id}`;
  }
}

async function createDatabaseIfMissing(): Promise<void> {
  // Managed DATABASE_URL databases must be provisioned by the platform.
  if (DATABASE_URL) {
    await sql`SELECT 1`;
    return;
  }
  try {
    await sql`SELECT 1`;
  } catch (err) {
    if (!(err instanceof postgres.PostgresError) || err.code !== "3D000") throw err;
    const admin = postgres({ database: "postgres" });
    await admin.unsafe(`CREATE DATABASE "${DATABASE}"`);
    await admin.end();
  }
}

export async function logEvent(
  type: string,
  actorId: string | null,
  subject: object | null,
  detail: object | null,
): Promise<void> {
  await sql`INSERT INTO events (type, actor_id, subject, detail)
            VALUES (${type}, ${actorId}, ${subject ? json(subject) : null}, ${detail ? json(detail) : null})`;
}
