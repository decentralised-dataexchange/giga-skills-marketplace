// One-off schema migrations that `CREATE TABLE IF NOT EXISTS` cannot express.
// Each migration is idempotent: it inspects the live catalog and returns early
// when the database is already in the target shape.
import { sql } from "./db";

// A database that predates the removal of the Integration Assistant and the
// developer showcase may still carry their `chats` and `applications` tables.
// Their rows are retained (dropping them is an operator decision, not a
// boot-time one), so the migration converts their keys too - otherwise the
// retained rows would keep integer owner ids that no longer resolve.

/** Tables whose integer primary key becomes a UUID (when present). */
const PK_TABLES = ["users", "orgs", "skills", "versions", "events", "chats", "applications"];

/** child table -> [old integer column, parent table] for every foreign key. */
const FK_COLUMNS: [table: string, column: string, parent: string][] = [
  ["tokens", "user_id", "users"],
  ["orgs", "owner_id", "users"],
  ["orgs", "decided_by", "users"],
  ["skills", "org_id", "orgs"],
  ["skills", "published_version_id", "versions"],
  ["versions", "skill_id", "skills"],
  ["versions", "submitted_by", "users"],
  ["versions", "reviewer_id", "users"],
  ["events", "actor_id", "users"],
  ["chats", "user_id", "users"],
  ["applications", "developer_id", "users"],
];

/** events.subject JSONB keys that hold a row id, and the table they point at. */
const SUBJECT_KEYS: [key: string, parent: string][] = [
  ["userId", "users"],
  ["orgId", "orgs"],
  ["skillId", "skills"],
  ["versionId", "versions"],
  ["chatId", "chats"],
  ["applicationId", "applications"],
];

/** Constraints to restore once the columns have been swapped. */
const NOT_NULL: [table: string, column: string][] = [
  ["tokens", "user_id"],
  ["orgs", "owner_id"],
  ["skills", "org_id"],
  ["versions", "skill_id"],
  ["chats", "user_id"],
  ["applications", "developer_id"],
];

const CASCADING_FKS = new Set(["tokens.user_id", "chats.user_id", "applications.developer_id"]);

async function columnType(table: string, column: string): Promise<string | null> {
  const [row] = await sql`
    SELECT data_type FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = ${table} AND column_name = ${column}`;
  return (row?.data_type as string) ?? null;
}

async function existingTables(): Promise<Set<string>> {
  const rows = await sql`
    SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema()`;
  return new Set(rows.map((r) => r.table_name as string));
}

/**
 * Convert the original SERIAL primary keys (and every foreign key pointing at
 * them) to UUIDs, preserving all rows and their relationships. Integer ids that
 * were denormalised into the audit log's `subject` JSON are remapped too, so the
 * public review trail keeps resolving after the migration.
 *
 * A fresh database is created by the UUID schema directly and skips this.
 */
export async function migrateIntegerIdsToUuid(): Promise<boolean> {
  if ((await columnType("users", "id")) !== "integer") return false;

  // A database predating one of these tables must not fail the whole
  // transaction; the schema bootstrap creates whatever is missing afterwards.
  const present = await existingTables();
  const pkTables = PK_TABLES.filter((t) => present.has(t));
  const fkColumns = FK_COLUMNS.filter(([t, , p]) => present.has(t) && present.has(p));
  const subjectKeys = present.has("events") ? SUBJECT_KEYS.filter(([, p]) => present.has(p)) : [];
  const notNull = NOT_NULL.filter(([t]) => present.has(t));

  await sql.begin(async (tx) => {
    // 1. A UUID surrogate on every table that owns an integer primary key.
    for (const table of pkTables) {
      await tx.unsafe(
        `ALTER TABLE ${table} ADD COLUMN uuid_id UUID NOT NULL DEFAULT gen_random_uuid()`,
      );
    }

    // 2. A UUID twin of every foreign key, resolved through the surrogate.
    for (const [table, column, parent] of fkColumns) {
      await tx.unsafe(`ALTER TABLE ${table} ADD COLUMN uuid_${column} UUID`);
      await tx.unsafe(
        `UPDATE ${table} c SET uuid_${column} = p.uuid_id FROM ${parent} p WHERE p.id = c.${column}`,
      );
    }

    // 3. Row ids embedded in the audit log's subject JSON.
    for (const [key, parent] of subjectKeys) {
      await tx.unsafe(
        `UPDATE events e SET subject = jsonb_set(e.subject, '{${key}}', to_jsonb(p.uuid_id::text))
         FROM ${parent} p
         WHERE e.subject ? '${key}' AND e.subject->>'${key}' ~ '^[0-9]+$'
           AND p.id = (e.subject->>'${key}')::int`,
      );
    }

    // 4. Drop the integer foreign keys first, then the integer primary keys
    //    they referenced (CASCADE clears the dependent PK/FK constraints).
    for (const [table, column] of fkColumns) {
      await tx.unsafe(`ALTER TABLE ${table} DROP COLUMN ${column}`);
    }
    for (const table of pkTables) {
      await tx.unsafe(`ALTER TABLE ${table} DROP COLUMN id CASCADE`);
    }

    // 5. Promote the UUID columns to the names the application uses.
    for (const table of pkTables) {
      await tx.unsafe(`ALTER TABLE ${table} RENAME COLUMN uuid_id TO id`);
      await tx.unsafe(`ALTER TABLE ${table} ADD PRIMARY KEY (id)`);
    }
    for (const [table, column] of fkColumns) {
      await tx.unsafe(`ALTER TABLE ${table} RENAME COLUMN uuid_${column} TO ${column}`);
    }

    // 6. Restore NOT NULL and referential integrity.
    for (const [table, column] of notNull) {
      await tx.unsafe(`ALTER TABLE ${table} ALTER COLUMN ${column} SET NOT NULL`);
    }
    for (const [table, column, parent] of fkColumns) {
      // skills.published_version_id was never a declared foreign key; leaving it
      // undeclared keeps the publish/supersede write order unchanged.
      if (table === "skills" && column === "published_version_id") continue;
      const onDelete = CASCADING_FKS.has(`${table}.${column}`) ? " ON DELETE CASCADE" : "";
      await tx.unsafe(
        `ALTER TABLE ${table} ADD CONSTRAINT ${table}_${column}_fkey
         FOREIGN KEY (${column}) REFERENCES ${parent}(id)${onDelete}`,
      );
    }
  });

  return true;
}
