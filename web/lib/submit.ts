// Shared submission pipeline: automated checks, slug ownership, version row.
// Used by the direct bundle API and the repository submission flow, so both
// paths create identical records and audit events. Callers open the source
// and submission first (one submission per publish action) and pass the
// transaction handle, so a failing skill aborts the whole submission.
import { sql, logEvent, json } from "@/lib/db";
import { runChecks } from "@/lib/checks";
import { ApiError } from "@/lib/handler";
import type { RepoRecord } from "@/lib/github";
import { skillView, versionView, type BundleFile } from "@/lib/views";

const MAX_BUNDLE_BYTES = 2 * 1024 * 1024;

export interface SubmissionInput {
  userId: string;
  org: { id: string };
  /** The source this submission belongs to. */
  sourceId: string;
  /** The submissions row every version of this publish action attaches to. */
  submissionId: string;
  files: BundleFile[];
  /** Overrides the manifest-derived version string when set. */
  version?: string;
  /** Repository provenance for repo-sourced submissions. */
  repo?: RepoRecord | null;
}

export async function createSubmission(input: SubmissionInput, db: typeof sql = sql) {
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

  // A skill name is unique inside the organisation and belongs to one source;
  // another organisation using the same name is no conflict at all.
  let [skill] = await db`SELECT * FROM skills WHERE org_id = ${org.id} AND slug = ${slug}`;
  if (skill && skill.source_id && skill.source_id !== input.sourceId) {
    throw new ApiError(409, `Name "${slug}" already belongs to another source in your organisation`);
  }
  if (skill && !skill.source_id) {
    // A row from before first-class sources; adopt it into this source.
    [skill] = await db`
      UPDATE skills SET source_id = ${input.sourceId} WHERE id = ${skill.id} RETURNING *`;
  }
  if (!skill) {
    try {
      [skill] = await db`
        INSERT INTO skills (slug, org_id, source_id)
        VALUES (${slug}, ${org.id}, ${input.sourceId}) RETURNING *`;
    } catch (err) {
      // Unique violation on (org_id, slug): a concurrent submission won the race.
      if ((err as { code?: string }).code === "23505") {
        throw new ApiError(409, `Name "${slug}" already belongs to another source in your organisation`);
      }
      throw err;
    }
  }

  // Failing checks never auto-reject: the report travels with the submission
  // as evidence, and the reviewer decides.
  const versionString = input.version ?? String(manifest.version ?? "unversioned");
  const [version] = await db`
    INSERT INTO versions (skill_id, submission_id, version, manifest, files, checks, status, submitted_by, repo)
    VALUES (${skill.id}, ${input.submissionId}, ${versionString}, ${json(manifest)}, ${json(files)},
            ${json(checks)}, 'submitted', ${userId}, ${input.repo ? json(input.repo) : null})
    RETURNING *`;
  await logEvent(
    "skill.submitted",
    userId,
    { skillId: skill.id, versionId: version.id, submissionId: input.submissionId },
    {
      slug,
      version: version.version,
      checksPassed: passed,
      ...(input.repo ? { repo: input.repo.url, commit: input.repo.commit } : {}),
    },
    db,
  );
  return { skill: skillView(skill), version: versionView(version), passed, slug };
}
