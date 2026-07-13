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

async function addUser(
  email: string,
  password: string,
  name: string,
  role: string,
): Promise<number> {
  const [row] = await sql`
    INSERT INTO users (email, name, role, password_hash)
    VALUES (${email}, ${name}, ${role}, ${hashPassword(password)}) RETURNING id`;
  return row.id;
}

async function addOrg(org: {
  name: string;
  website: string;
  description: string;
  contact: string;
  ownerId: number;
  status: string;
  decidedBy?: number;
  notes?: string;
}): Promise<number> {
  const [row] = await sql`
    INSERT INTO orgs (name, website, description, contact, owner_id, status, decided_at, decided_by, decision_notes)
    VALUES (${org.name}, ${org.website}, ${org.description}, ${org.contact}, ${org.ownerId}, ${org.status},
            ${org.status === "pending" ? null : sql`now()`}, ${org.decidedBy ?? null}, ${org.notes ?? null})
    RETURNING id`;
  return row.id;
}

async function addSkill(
  orgId: number,
  bundle: string,
  submitterId: number,
  publish: boolean,
  reviewerId?: number,
  official = false,
) {
  const files = readBundle(bundle);
  const { checks, passed, manifest } = runChecks(files);
  if (!manifest?.name) throw new Error(`Seed bundle ${bundle} has no manifest name`);
  const type = manifest.type === "usecase" ? "usecase" : "skill";
  const [skill] = await sql`
    INSERT INTO skills (slug, org_id, type, official)
    VALUES (${manifest.name}, ${orgId}, ${type}, ${official && publish}) RETURNING id`;
  const status = publish && passed ? "published" : passed ? "submitted" : "checks_failed";
  const notes = publish
    ? "Automated checks pass; manifest, OpenAPI surface, schemas and rulebooks reviewed against marketplace guidelines."
    : null;
  const [version] = await sql`
    INSERT INTO versions (skill_id, version, manifest, files, checks, status, submitted_by, reviewer_id, review_notes, decided_at)
    VALUES (${skill.id}, ${String(manifest.version)}, ${json(manifest)}, ${json(files)}, ${json(checks)},
            ${status}, ${submitterId}, ${publish ? (reviewerId ?? null) : null}, ${notes},
            ${status === "published" ? sql`now()` : null})
    RETURNING id`;
  if (status === "published") {
    await sql`UPDATE skills SET status = 'published', published_version_id = ${version.id} WHERE id = ${skill.id}`;
    await logEvent(
      "review.approve",
      reviewerId ?? submitterId,
      { skillId: skill.id, versionId: version.id },
      { slug: manifest.name, notes, official: official && publish },
    );
  }
}

async function addApplication(app: {
  developerId: number;
  title: string;
  description: string;
  videoUrl: string | null;
  repoUrl: string | null;
  skills: string[];
  usecases: string[];
}): Promise<void> {
  await sql`
    INSERT INTO applications (developer_id, title, description, video_url, repo_url, skills, usecases)
    VALUES (${app.developerId}, ${app.title}, ${app.description}, ${app.videoUrl}, ${app.repoUrl},
            ${json(app.skills)}, ${json(app.usecases)})`;
}

export async function seedIfEmpty(): Promise<boolean> {
  const [{ n }] = await sql`SELECT count(*)::int AS n FROM users`;
  if (n > 0) return false;

  const superadmin = await addUser(
    "superadmin@govbuild.test",
    "super123",
    "Marketplace Operator",
    "superadmin",
  );
  const reviewer = await addUser(
    "reviewer@govbuild.test",
    "review123",
    "Skill Reviewer",
    "reviewer",
  );
  const igrant = await addUser(
    "provider@igrant.io",
    "provider123",
    "iGrant.io Developer Relations",
    "provider",
  );
  const educhain = await addUser("labs@educhain.test", "provider123", "EduChain Labs", "provider");
  const student = await addUser("student@example.com", "student123", "Amina Okafor", "builder");

  const orgIgrant = await addOrg({
    name: "iGrant.io (LCubed AB)",
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
      "Startup building credential analytics tooling; applying to publish a transcript-analytics skill.",
    contact: "labs@educhain.test",
    ownerId: educhain,
    status: "pending",
  });

  // All catalog skills are published by iGrant.io (LCubed AB).
  await addSkill(orgIgrant, "igrantio-education-issuer", igrant, true, reviewer);
  await addSkill(orgIgrant, "igrantio-consent-bb", igrant, true, reviewer, true); // official
  await addSkill(orgIgrant, "igrantio-education-verifier", igrant, false); // sits in the review queue

  // A use-case template (journey-tagged prompt chain) composing the skills above.
  await addSkill(orgIgrant, "national-learner-registry", igrant, true, reviewer, true);

  await addApplication({
    developerId: student,
    title: "Basic credential query with DCQL and OpenID4VP",
    description:
      "A verifier that requests a learner credential from an EUDI Wallet using a DCQL query over OpenID4VP, then checks the presented diploma before enrolment. Built with an agent from the NLR use case.",
    videoUrl: "https://www.youtube.com/watch?v=d2MOt01HKx4",
    repoUrl: "https://github.com/decentralised-dataexchange/ai-integrator",
    skills: ["igrantio-education-verifier"],
    usecases: ["national-learner-registry"],
  });
  await addApplication({
    developerId: student,
    title: "Request and share alternative IDs with DCQL and OpenID4VP",
    description:
      "An enrolment flow that requests and shares alternative learner identifiers from an EUDI Wallet using DCQL over OpenID4VP. Scaffolded from the education issuer and consent skills.",
    videoUrl: "https://www.youtube.com/watch?v=K0WuGRXAubE",
    repoUrl: null,
    skills: ["igrantio-education-issuer", "igrantio-consent-bb"],
    usecases: ["national-learner-registry"],
  });

  await logEvent("seed.completed", superadmin, null, { note: "Demo data seeded" });
  return true;
}
