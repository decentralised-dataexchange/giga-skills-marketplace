// Seeds demo users, organisations, and skill bundles (runs once, when empty).
// Bundle contents live as real files under seed-bundles/<skill>/.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { json, logEvent, sql } from "./db";
import { hashPassword } from "./auth";
import { runChecks } from "./checks";
import type { BundleFile } from "./views";

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

async function addUser(email: string, password: string, name: string, role: string): Promise<number> {
  const [row] = await sql`
    INSERT INTO users (email, name, role, password_hash)
    VALUES (${email}, ${name}, ${role}, ${hashPassword(password)}) RETURNING id`;
  return row.id;
}

async function addOrg(org: {
  name: string; website: string; description: string; contact: string;
  ownerId: number; status: string; decidedBy?: number; notes?: string;
}): Promise<number> {
  const [row] = await sql`
    INSERT INTO orgs (name, website, description, contact, owner_id, status, decided_at, decided_by, decision_notes)
    VALUES (${org.name}, ${org.website}, ${org.description}, ${org.contact}, ${org.ownerId}, ${org.status},
            ${org.status === "pending" ? null : sql`now()`}, ${org.decidedBy ?? null}, ${org.notes ?? null})
    RETURNING id`;
  return row.id;
}

async function addSkill(orgId: number, bundle: string, submitterId: number, publish: boolean, reviewerId?: number) {
  const files = readBundle(bundle);
  const { checks, passed, manifest } = runChecks(files);
  if (!manifest?.name) throw new Error(`Seed bundle ${bundle} has no manifest name`);
  const [skill] = await sql`INSERT INTO skills (slug, org_id) VALUES (${manifest.name}, ${orgId}) RETURNING id`;
  const status = publish && passed ? "published" : passed ? "submitted" : "checks_failed";
  const notes = publish
    ? "Automated checks pass; manifest, OpenAPI surface, schemas and rulebooks reviewed against marketplace guidelines."
    : null;
  const [version] = await sql`
    INSERT INTO versions (skill_id, version, manifest, files, checks, status, submitted_by, reviewer_id, review_notes, decided_at)
    VALUES (${skill.id}, ${String(manifest.version)}, ${json(manifest)}, ${json(files)}, ${json(checks)},
            ${status}, ${submitterId}, ${publish ? reviewerId ?? null : null}, ${notes},
            ${status === "published" ? sql`now()` : null})
    RETURNING id`;
  if (status === "published") {
    await sql`UPDATE skills SET status = 'published', published_version_id = ${version.id} WHERE id = ${skill.id}`;
  }
}

export async function seedIfEmpty(): Promise<boolean> {
  const [{ n }] = await sql`SELECT count(*)::int AS n FROM users`;
  if (n > 0) return false;

  const superadmin = await addUser("superadmin@govbuild.test", "super123", "Marketplace Operator", "superadmin");
  const reviewer = await addUser("reviewer@govbuild.test", "review123", "Skill Reviewer", "reviewer");
  const igrant = await addUser("provider@igrant.io", "provider123", "iGrant.io Developer Relations", "provider");
  const govstack = await addUser("trust@govstack.test", "provider123", "GovStack Trust Services", "provider");
  const educhain = await addUser("labs@educhain.test", "provider123", "EduChain Labs", "provider");
  await addUser("student@example.com", "student123", "Amina Okafor", "builder");

  const orgIgrant = await addOrg({
    name: "iGrant.io (LCubed AB)", website: "https://igrant.io",
    description: "Data exchange and wallet provider. Publishes skill files for its Data Wallet (holder) and Organisation Wallet Suite (issuer and verifier).",
    contact: "provider@igrant.io", ownerId: igrant, status: "approved", decidedBy: superadmin,
    notes: "Verified provider: developer APIs and sandbox documented at docs.igrant.io.",
  });
  const orgGovstack = await addOrg({
    name: "GovStack Trust Services", website: "https://govstack.global",
    description: "Publishes GovStack building-block skill files: consent management (ISO/IEC 27560), e-signature, and information mediator patterns.",
    contact: "trust@govstack.test", ownerId: govstack, status: "approved", decidedBy: superadmin,
    notes: "Verified provider.",
  });
  await addOrg({
    name: "EduChain Labs", website: "https://educhain.example",
    description: "Startup building credential analytics tooling; applying to publish a transcript-analytics skill.",
    contact: "labs@educhain.test", ownerId: educhain, status: "pending",
  });

  await addSkill(orgIgrant, "igrantio-education-issuer", igrant, true, reviewer);
  await addSkill(orgGovstack, "govstack-consent-bb", govstack, true, reviewer);
  await addSkill(orgIgrant, "igrantio-education-verifier", igrant, false); // sits in the review queue

  await logEvent("seed.completed", superadmin, null, { note: "Demo data seeded" });
  return true;
}
