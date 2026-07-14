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

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('builder','provider','reviewer','superadmin')),
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  password_hash TEXT NOT NULL,
  settings      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS tokens (
  token      TEXT PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS orgs (
  id             SERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  website        TEXT,
  description    TEXT,
  contact        TEXT,
  owner_id       INT NOT NULL REFERENCES users(id),
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at     TIMESTAMPTZ,
  decided_by     INT REFERENCES users(id),
  decision_notes TEXT
);
CREATE TABLE IF NOT EXISTS skills (
  id                   SERIAL PRIMARY KEY,
  slug                 TEXT UNIQUE NOT NULL,
  org_id               INT NOT NULL REFERENCES orgs(id),
  type                 TEXT NOT NULL DEFAULT 'skill' CHECK (type IN ('skill','usecase')),
  status               TEXT NOT NULL DEFAULT 'in_submission',
  official             BOOLEAN NOT NULL DEFAULT false,
  published_version_id INT,
  installs             INT NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS versions (
  id           SERIAL PRIMARY KEY,
  skill_id     INT NOT NULL REFERENCES skills(id),
  version      TEXT NOT NULL,
  manifest     JSONB,
  files        JSONB NOT NULL,
  checks       JSONB NOT NULL DEFAULT '[]',
  status       TEXT NOT NULL,
  submitted_by INT REFERENCES users(id),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewer_id  INT REFERENCES users(id),
  review_notes TEXT,
  decided_at   TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS chats (
  id         SERIAL PRIMARY KEY,
  share_id   TEXT UNIQUE,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL DEFAULT 'Untitled app',
  model      TEXT,
  skills     JSONB NOT NULL DEFAULT '[]',
  messages   JSONB NOT NULL DEFAULT '[]',
  app_html   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS events (
  id       SERIAL PRIMARY KEY,
  type     TEXT NOT NULL,
  actor_id INT REFERENCES users(id),
  subject  JSONB,
  detail   JSONB,
  at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS applications (
  id           SERIAL PRIMARY KEY,
  developer_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  video_url    TEXT,
  repo_url     TEXT,
  skills       JSONB NOT NULL DEFAULT '[]',
  usecases     JSONB NOT NULL DEFAULT '[]',
  status       TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published','delisted')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE chats ADD COLUMN IF NOT EXISTS share_id TEXT UNIQUE;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS official BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'skill';
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS logo TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orgs_slug ON orgs(slug);
CREATE INDEX IF NOT EXISTS idx_tokens_user ON tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_orgs_owner ON orgs(owner_id, id);
CREATE INDEX IF NOT EXISTS idx_skills_type ON skills(type, status);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status, id DESC);
CREATE INDEX IF NOT EXISTS idx_applications_developer ON applications(developer_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_chats_user ON chats(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_versions_skill ON versions(skill_id);
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
  const missing = await sql`SELECT id, name FROM orgs WHERE slug IS NULL ORDER BY id`;
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
  actorId: number | null,
  subject: object | null,
  detail: object | null,
): Promise<void> {
  await sql`INSERT INTO events (type, actor_id, subject, detail)
            VALUES (${type}, ${actorId}, ${subject ? json(subject) : null}, ${detail ? json(detail) : null})`;
}
