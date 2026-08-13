// Shared submission pipeline: automated checks, slug ownership, version row.
// Used by the direct bundle API and the repository submission flow, so both
// paths create identical records and audit events.
import { sql, logEvent, json } from "@/lib/db";
import { runChecks } from "@/lib/checks";
import { ApiError } from "@/lib/handler";
import type { RepoRecord } from "@/lib/github";
import { skillView, versionView, type BundleFile } from "@/lib/views";

const MAX_BUNDLE_BYTES = 2 * 1024 * 1024;

export interface SubmissionInput {
  userId: string;
  org: { id: string };
  files: BundleFile[];
  /** Overrides the manifest-derived version string when set. */
  version?: string;
  /** Repository provenance for repo-sourced submissions. */
  repo?: RepoRecord | null;
}

export async function createSubmission(input: SubmissionInput) {
  const { userId, org, files } = input;
  if (!Array.isArray(files) || files.length === 0) {
    throw new ApiError(400, "files[] is required: [{ path, content }]");
  }
  for (const f of files) {
    if (f.path.includes("..") || f.path.startsWith("/")) {
      throw new ApiError(400, `Illegal path: ${f.path}`);
    }
  }
  if (files.reduce((n, f) => n + f.content.length, 0) > MAX_BUNDLE_BYTES) {
    throw new ApiError(400, "Bundle exceeds the 2 MB limit");
  }

  const { checks, passed, manifest } = runChecks(files);
  if (!manifest?.name) {
    throw new ApiError(400, 'SKILL.md manifest with a "name" field is required');
  }
  const slug = String(manifest.name);

  let [skill] = await sql`SELECT * FROM skills WHERE slug = ${slug}`;
  if (skill && skill.org_id !== org.id) {
    throw new ApiError(409, `Name "${slug}" is owned by another organisation`);
  }
  if (!skill) {
    [skill] = await sql`INSERT INTO skills (slug, org_id) VALUES (${slug}, ${org.id}) RETURNING *`;
  }

  // Failing checks never auto-reject: the report travels with the submission
  // as evidence, and the reviewer decides.
  const versionString = input.version ?? String(manifest.version ?? "unversioned");
  const [version] = await sql`
    INSERT INTO versions (skill_id, version, manifest, files, checks, status, submitted_by, repo)
    VALUES (${skill.id}, ${versionString}, ${json(manifest)}, ${json(files)}, ${json(checks)},
            'submitted', ${userId}, ${input.repo ? json(input.repo) : null})
    RETURNING *`;
  await logEvent(
    "skill.submitted",
    userId,
    { skillId: skill.id, versionId: version.id },
    {
      slug,
      version: version.version,
      checksPassed: passed,
      ...(input.repo ? { repo: input.repo.url, commit: input.repo.commit } : {}),
    },
  );
  return { skill: skillView(skill), version: versionView(version), passed, slug };
}
