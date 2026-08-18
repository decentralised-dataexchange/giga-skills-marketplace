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
CREATE TABLE IF NOT EXISTS sources (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES orgs(id),
  url        TEXT,
  owner      TEXT,
  repo       TEXT,
  status     TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS submissions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id    UUID NOT NULL REFERENCES sources(id),
  repo         JSONB,
  status       TEXT NOT NULL DEFAULT 'submitted'
               CHECK (status IN ('submitted','in_review','approved','rejected','changes_requested','superseded','archived')),
  submitted_by UUID REFERENCES users(id),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewer_id  UUID REFERENCES users(id),
  review_notes TEXT,
  decided_at   TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS skills (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                 TEXT NOT NULL,
  org_id               UUID NOT NULL REFERENCES orgs(id),
  source_id            UUID REFERENCES sources(id),
  status               TEXT NOT NULL DEFAULT 'in_submission',
  official             BOOLEAN NOT NULL DEFAULT false,
  published_version_id UUID,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS versions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id      UUID NOT NULL REFERENCES skills(id),
  submission_id UUID REFERENCES submissions(id),
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
-- Skill sources are first-class records; databases from before that change
-- carry only the versions.repo blob and get these columns backfilled in
-- backfillSources().
ALTER TABLE skills ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES sources(id);
ALTER TABLE versions ADD COLUMN IF NOT EXISTS submission_id UUID REFERENCES submissions(id);
-- A skill name is unique inside one organisation, not across the catalog, so
-- several organisations can publish the same source and the same skill names.
-- The composite index is created before the old global unique is dropped: it
-- is strictly weaker, so it always succeeds on data that satisfied the old one.
CREATE UNIQUE INDEX IF NOT EXISTS idx_skills_org_slug ON skills(org_id, slug);
DO $$
DECLARE c RECORD;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'skills'::regclass AND contype = 'u'
      AND conkey = ARRAY[(SELECT attnum FROM pg_attribute
                          WHERE attrelid = 'skills'::regclass AND attname = 'slug')]
  LOOP
    EXECUTE format('ALTER TABLE skills DROP CONSTRAINT %I', c.conname);
  END LOOP;
  FOR c IN
    SELECT indexname FROM pg_indexes
    WHERE schemaname = current_schema() AND tablename = 'skills'
      AND indexname <> 'idx_skills_org_slug' AND indexdef LIKE 'CREATE UNIQUE INDEX%(slug)'
  LOOP
    EXECUTE format('DROP INDEX %I', c.indexname);
  END LOOP;
END $$;
-- A superadmin can suspend an organisation; a database from before that
-- change carries a status constraint without the 'suspended' value.
ALTER TABLE orgs DROP CONSTRAINT IF EXISTS orgs_status_check;
ALTER TABLE orgs ADD CONSTRAINT orgs_status_check
  CHECK (status IN ('pending','approved','rejected','suspended'));
-- Removal from the catalog is called "archived" (it was "delisted"). Statuses
-- migrate; event rows are history and keep their original types. The old
-- CHECK must go before the data moves, and returns with the new vocabulary.
-- Archiving a source also withdraws its waiting submissions from the review
-- queue, so the submissions CHECK gains the 'archived' value.
ALTER TABLE sources DROP CONSTRAINT IF EXISTS sources_status_check;
UPDATE sources SET status = 'archived' WHERE status = 'delisted';
ALTER TABLE sources ADD CONSTRAINT sources_status_check
  CHECK (status IN ('active','archived'));
UPDATE skills SET status = 'archived' WHERE status = 'delisted';
UPDATE versions SET status = 'archived' WHERE status = 'delisted';
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_status_check;
ALTER TABLE submissions ADD CONSTRAINT submissions_status_check
  CHECK (status IN ('submitted','in_review','approved','rejected','changes_requested','superseded','archived'));
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
-- as skills rows with type='usecase'; archive them so they stay stored but
-- never resurface in the public catalog.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'skills' AND column_name = 'type'
  ) THEN
    UPDATE skills SET status = 'archived' WHERE type = 'usecase' AND status <> 'archived';
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orgs_slug ON orgs(slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sources_org_url ON sources(org_id, COALESCE(url, 'direct'));
CREATE INDEX IF NOT EXISTS idx_submissions_source ON submissions(source_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status, submitted_at);
CREATE INDEX IF NOT EXISTS idx_skills_source ON skills(source_id);
CREATE INDEX IF NOT EXISTS idx_versions_submission ON versions(submission_id);
CREATE INDEX IF NOT EXISTS idx_tokens_user ON tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_orgs_owner ON orgs(owner_id, created_at);
CREATE INDEX IF NOT EXISTS idx_skills_org ON skills(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_skills_status ON skills(status);
CREATE INDEX IF NOT EXISTS idx_versions_skill ON versions(skill_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_versions_status_submitted ON versions(status, submitted_at);
CREATE INDEX IF NOT EXISTS idx_events_at ON events(at DESC);
-- The showcase (under /showcase) keeps no server-side state at all: its
-- demo data lives in the visitor's browser, and its brokers poll OWS
-- directly. A database from before that change may carry an unused
-- showcase_exchange_events relay table; dropping it is an operator call.
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
      if (await backfillSources()) console.log("Backfilled sources and submissions.");
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

// A database from before first-class sources carries the source only as the
// versions.repo blob. Rebuild the aggregate once: a sources row per
// (organisation, repository url), a submissions row per (source, commit) —
// one from-repo call — or per repo-less version, and the new foreign keys.
// Runs each boot; a no-op once no row is missing its source or submission.
async function backfillSources(): Promise<boolean> {
  const missingSkill = await sql`SELECT 1 FROM skills WHERE source_id IS NULL LIMIT 1`;
  const missingVersion = await sql`SELECT 1 FROM versions WHERE submission_id IS NULL LIMIT 1`;
  if (!missingSkill.length && !missingVersion.length) return false;

  await sql`
    INSERT INTO sources (org_id, url, owner, repo)
    SELECT DISTINCT ON (s.org_id, v.repo->>'url')
           s.org_id, v.repo->>'url', v.repo->>'owner', v.repo->>'repo'
    FROM versions v JOIN skills s ON s.id = v.skill_id
    WHERE v.repo IS NOT NULL AND v.submission_id IS NULL
    ORDER BY s.org_id, v.repo->>'url', v.submitted_at DESC
    ON CONFLICT (org_id, COALESCE(url, 'direct')) DO NOTHING`;
  await sql`
    INSERT INTO sources (org_id, url)
    SELECT DISTINCT s.org_id, NULL::text
    FROM versions v JOIN skills s ON s.id = v.skill_id
    WHERE v.repo IS NULL AND v.submission_id IS NULL
    ON CONFLICT (org_id, COALESCE(url, 'direct')) DO NOTHING`;

  // A skill belongs to the source its newest version came from.
  await sql`
    UPDATE skills sk
    SET source_id = src.id
    FROM (SELECT DISTINCT ON (skill_id) skill_id, repo->>'url' AS url
          FROM versions ORDER BY skill_id, submitted_at DESC) last,
         sources src
    WHERE sk.id = last.skill_id AND sk.source_id IS NULL
      AND src.org_id = sk.org_id
      AND COALESCE(src.url, 'direct') = COALESCE(last.url, 'direct')`;
  await sql`
    UPDATE sources src SET status = 'archived'
    WHERE src.status = 'active'
      AND EXISTS (SELECT 1 FROM skills k WHERE k.source_id = src.id)
      AND NOT EXISTS (SELECT 1 FROM skills k WHERE k.source_id = src.id AND k.status <> 'archived')`;

  const sources = await sql`SELECT id, org_id, url FROM sources`;
  const sourceByKey = new Map<string, string>(
    sources.map((s) => [`${s.org_id} ${s.url ?? "direct"}`, s.id as string]),
  );
  const versions = await sql`
    SELECT v.id, v.status, v.submitted_by, v.submitted_at, v.reviewer_id,
           v.review_notes, v.decided_at, v.repo, s.org_id
    FROM versions v JOIN skills s ON s.id = v.skill_id
    WHERE v.submission_id IS NULL
    ORDER BY v.submitted_at`;

  interface Group {
    sourceId: string;
    versions: (typeof versions)[number][];
  }
  const groups = new Map<string, Group>();
  for (const v of versions) {
    const sourceId = sourceByKey.get(`${v.org_id} ${v.repo?.url ?? "direct"}`);
    if (!sourceId) continue; // defensive; the inserts above cover every version
    // One from-repo call pinned every skill to one commit; repo-less versions
    // were each their own submission.
    const key = v.repo ? `${sourceId} ${v.repo.commit ?? v.id}` : `version ${v.id}`;
    const group = groups.get(key) ?? { sourceId, versions: [] };
    group.versions.push(v);
    groups.set(key, group);
  }

  // The group's review state is its most demanding member's.
  const PRECEDENCE = [
    "in_review",
    "submitted",
    "published",
    "changes_requested",
    "rejected",
    "superseded",
  ];
  for (const group of groups.values()) {
    const rows = group.versions;
    const versionStatus =
      PRECEDENCE.find((s) => rows.some((v) => v.status === s)) ?? rows[0].status;
    const status = versionStatus === "published" ? "approved" : versionStatus;
    const first = rows[0];
    const decided = rows.filter((v) => v.decided_at).at(-1);
    const newest = rows.at(-1)!;
    const [submission] = await sql`
      INSERT INTO submissions (source_id, repo, status, submitted_by, submitted_at,
                               reviewer_id, review_notes, decided_at)
      VALUES (${group.sourceId}, ${newest.repo ? json(newest.repo) : null}, ${status},
              ${first.submitted_by}, ${first.submitted_at}, ${decided?.reviewer_id ?? null},
              ${decided?.review_notes ?? null}, ${decided?.decided_at ?? null})
      RETURNING id`;
    await sql`UPDATE versions SET submission_id = ${submission.id}
              WHERE id = ANY(${rows.map((v) => v.id as string)})`;
  }
  return true;
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
  db: typeof sql = sql, // pass the transaction handle so the event rolls back with it
): Promise<void> {
  await db`INSERT INTO events (type, actor_id, subject, detail)
           VALUES (${type}, ${actorId}, ${subject ? json(subject) : null}, ${detail ? json(detail) : null})`;
}
