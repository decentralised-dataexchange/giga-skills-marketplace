// Seeds demo users, organisations, and skill bundles (runs once, when empty,
// and only in demo mode), and bootstraps the operator's super admin from the
// environment (every boot, every mode).
// Bundle contents live as real files under seed-bundles/<skill>/.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { json, logEvent, sql } from "./db";
import { hashPassword, verifyPassword } from "./auth";
import { runChecks } from "./checks";
import { DEMO_ACCOUNTS } from "./demo-accounts";
import { isDemoMode } from "./settings";
import type { BundleFile } from "./views";

/** Shortest password the environment may set for the super admin. */
const SUPERADMIN_MIN_PASSWORD = 12;

const BUNDLES_DIR = join(process.cwd(), "seed-bundles");

function readBundle(name: string): BundleFile[] {
  const root = join(BUNDLES_DIR, name);
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry);
      return statSync(full).isDirectory() ? walk(full) : [full];
    });
  return walk(root).map((full) => ({
    path: relative(root, full),
    content: readFileSync(full, "utf8"),
  }));
}

async function addUser(
  email: string,
  password: string,
  name: string,
  role: string,
): Promise<string> {
  const passwordHash = await hashPassword(password);
  const [row] = await sql`
    INSERT INTO users (email, name, role, password_hash)
    VALUES (${email}, ${name}, ${role}, ${passwordHash}) RETURNING id`;
  return row.id;
}

async function addOrg(org: {
  name: string;
  website: string;
  description: string;
  contact: string;
  ownerId: string;
  status: string;
  decidedBy?: string;
  notes?: string;
}): Promise<string> {
  const [row] = await sql`
    INSERT INTO orgs (name, website, description, contact, owner_id, status, decided_at, decided_by, decision_notes)
    VALUES (${org.name}, ${org.website}, ${org.description}, ${org.contact}, ${org.ownerId}, ${org.status},
            ${org.status === "pending" ? null : sql`now()`}, ${org.decidedBy ?? null}, ${org.notes ?? null})
    RETURNING id`;
  return row.id;
}

// One seed submission = one review unit: every bundle in it is decided as a
// whole, exactly like the live flow. The org's pseudo-source (url NULL, the
// public "bundles" segment) is created on first use.
async function addSubmission(
  orgId: string,
  bundles: string[],
  submitterId: string,
  publish: boolean,
  reviewerId?: string,
) {
  await sql`INSERT INTO sources (org_id) VALUES (${orgId})
            ON CONFLICT (org_id, COALESCE(url, 'direct')) DO NOTHING`;
  const [source] = await sql`SELECT id FROM sources WHERE org_id = ${orgId} AND url IS NULL`;
  const status = publish ? "approved" : "submitted";
  const notes = publish
    ? "Automated checks pass; manifest, OpenAPI surface, schemas and rulebooks reviewed against marketplace guidelines."
    : null;
  const [submission] = await sql`
    INSERT INTO submissions (source_id, status, submitted_by, reviewer_id, review_notes, decided_at)
    VALUES (${source.id}, ${status}, ${submitterId}, ${publish ? (reviewerId ?? null) : null},
            ${notes}, ${publish ? sql`now()` : null})
    RETURNING id`;

  for (const bundle of bundles) {
    const files = readBundle(bundle);
    const { checks, manifest } = runChecks(files);
    if (!manifest?.name) throw new Error(`Seed bundle ${bundle} has no manifest name`);
    const [skill] = await sql`
      INSERT INTO skills (slug, org_id, source_id)
      VALUES (${manifest.name}, ${orgId}, ${source.id}) RETURNING id`;
    const [version] = await sql`
      INSERT INTO versions (skill_id, submission_id, version, manifest, files, checks, status,
                            submitted_by, reviewer_id, review_notes, decided_at)
      VALUES (${skill.id}, ${submission.id}, ${String(manifest.version)}, ${json(manifest)},
              ${json(files)}, ${json(checks)}, ${publish ? "published" : "submitted"},
              ${submitterId}, ${publish ? (reviewerId ?? null) : null}, ${notes},
              ${publish ? sql`now()` : null})
      RETURNING id`;
    if (publish) {
      await sql`UPDATE skills SET status = 'published', published_version_id = ${version.id} WHERE id = ${skill.id}`;
      await logEvent(
        "review.approve",
        reviewerId ?? submitterId,
        { skillId: skill.id, versionId: version.id, submissionId: submission.id },
        { slug: manifest.name, notes },
      );
    }
  }
}

export async function seedIfEmpty(): Promise<boolean> {
  const [{ n }] = await sql`SELECT count(*)::int AS n FROM users`;
  if (n > 0) return false;
  // Outside demo mode there is no demo data. The only bootstrapped account
  // is the operator's super admin (ensureSuperadmin below).
  if (!(await isDemoMode())) return false;

  const ids = new Map<string, string>();
  for (const account of DEMO_ACCOUNTS) {
    ids.set(
      account.email,
      await addUser(account.email, account.password, account.name, account.role),
    );
  }
  const demo = (email: string): string => {
    const id = ids.get(email);
    if (!id) throw new Error(`Demo account ${email} is not in DEMO_ACCOUNTS`);
    return id;
  };
  const superadmin = demo("superadmin@govbuild.test");
  const reviewer = demo("reviewer@govbuild.test");
  const igrant = demo("provider@igrant.io");
  const educhain = demo("labs@educhain.test");

  const orgIgrant = await addOrg({
    name: "iGrant.io",
    website: "https://igrant.io",
    description:
      "Data exchange and wallet provider. Publishes skill files for its Data Wallet (holder) and Organisation Wallet Suite (issuer and verifier).",
    contact: "provider@igrant.io",
    ownerId: igrant,
    status: "approved",
    decidedBy: superadmin,
    notes: "Verified provider: developer APIs and sandbox documented at docs.igrant.io.",
  });
  await addOrg({
    name: "EduChain Labs",
    website: "https://educhain.example",
    description:
      "Startup building credential analytics tooling; preparing a transcript-analytics skill.",
    contact: "labs@educhain.test",
    ownerId: educhain,
    status: "approved",
  });

  // All catalog skills are published by iGrant.io (LCubed AB): one approved
  // submission with the live skills, one submission waiting in the queue.
  await addSubmission(
    orgIgrant,
    ["igrantio-education-issuer", "igrantio-consent-bb"],
    igrant,
    true,
    reviewer,
  );
  await addSubmission(orgIgrant, ["igrantio-education-verifier"], igrant, false);

  await logEvent("seed.completed", superadmin, null, { note: "Demo data seeded" });
  return true;
}

/**
 * The operator's super admin, from the environment: SUPERADMIN_EMAIL and
 * SUPERADMIN_PASSWORD (SUPERADMIN_NAME optional). Runs on every boot, in
 * every mode: the account is created when missing, and its password, role
 * and status follow the environment, so a rotated secret or a locked-out
 * operator is fixed by a restart. With demo mode off the app refuses to boot
 * while no active super admin exists, because governance roles can only be
 * granted by one (registration creates providers only).
 */
export async function ensureSuperadmin(): Promise<"created" | "updated" | "unchanged" | "none"> {
  const email = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPERADMIN_PASSWORD;
  const name = process.env.SUPERADMIN_NAME?.trim() || "Marketplace Operator";

  if (!email || !password) {
    if (email || password) {
      throw new Error("SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD must be set together");
    }
    if (!(await isDemoMode())) {
      const [{ n }] = await sql`
        SELECT count(*)::int AS n FROM users WHERE role = 'superadmin' AND status = 'active'`;
      if (n === 0) {
        throw new Error(
          "Demo mode is off and no active super admin exists: set SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD",
        );
      }
    }
    return "none";
  }
  if (password.length < SUPERADMIN_MIN_PASSWORD) {
    throw new Error(`SUPERADMIN_PASSWORD must be at least ${SUPERADMIN_MIN_PASSWORD} characters`);
  }

  const [existing] = await sql`
    SELECT id, role, status, password_hash FROM users WHERE email = ${email}`;
  if (!existing) {
    const id = await addUser(email, password, name, "superadmin");
    await logEvent("superadmin.bootstrapped", id, { userId: id }, { email, action: "created" });
    return "created";
  }
  const samePassword = await verifyPassword(password, existing.password_hash);
  if (samePassword && existing.role === "superadmin" && existing.status === "active") {
    return "unchanged";
  }
  const passwordHash = samePassword ? existing.password_hash : await hashPassword(password);
  await sql`
    UPDATE users SET password_hash = ${passwordHash}, role = 'superadmin', status = 'active'
    WHERE id = ${existing.id}`;
  await logEvent(
    "superadmin.bootstrapped",
    existing.id,
    { userId: existing.id },
    { email, action: "updated" },
  );
  return "updated";
}

/**
 * Demo mode switched from the dashboard. On: every demo account exists and is
 * active (created with its demo password when missing, for a marketplace
 * that started outside demo mode; the demo organisations and skills are a
 * first-boot seed only). Off: the demo accounts are suspended and their
 * sessions revoked, so the public demo passwords open nothing. The account
 * that flips the switch (`keepUserId`) is left active even when it is a demo
 * account, so the operator is never locked out; the dashboard then tells
 * them to change its password.
 */
export async function setDemoAccountsEnabled(enabled: boolean, keepUserId?: string): Promise<void> {
  const status = enabled ? "active" : "suspended";
  for (const account of DEMO_ACCOUNTS) {
    const [existing] = await sql`SELECT id, status FROM users WHERE email = ${account.email}`;
    if (!existing) {
      if (enabled) await addUser(account.email, account.password, account.name, account.role);
      continue;
    }
    if (existing.id === keepUserId) continue;
    if (existing.status !== status) {
      await sql`UPDATE users SET status = ${status} WHERE id = ${existing.id}`;
    }
    if (!enabled) await sql`DELETE FROM tokens WHERE user_id = ${existing.id}`;
  }
}
