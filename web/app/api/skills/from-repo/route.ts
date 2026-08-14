// Submit every skill found in a public GitHub repository (optionally a chosen
// subset of directories) for review, as ONE source submission. The server
// re-fetches the repository itself, pinned to the resolved commit, so the
// stored files and repository metadata are marketplace-verified. Resubmitting
// the same repository at a new commit or tag creates a fresh submission that
// goes through review again. The write is all-or-nothing: one bad skill
// aborts the whole submission.
import { NextResponse } from "next/server";
import { json, sql } from "@/lib/db";
import { check, route } from "@/lib/handler";
import { isUuid } from "@/lib/utils";
import { deriveVersion, fetchRepoSnapshot, parseRepoUrl, repoRecord } from "@/lib/github";
import { runChecks } from "@/lib/checks";
import { createSubmission } from "@/lib/submit";
import { findOrCreateSource } from "@/lib/sources";
import { sourceView, submissionView } from "@/lib/views";

export const POST = route(
  async ({ user, body }) => {
    const { orgId, url, ref, dirs } = await body<{
      orgId: string;
      url: string;
      ref?: string;
      dirs?: string[];
    }>();

    check(isUuid(orgId), 404, "Organisation not found");
    const [org] = await sql`SELECT * FROM orgs WHERE id = ${orgId} AND owner_id = ${user!.id}`;
    check(org, 404, "Organisation not found");
    check(org.status === "approved", 403, "This organisation is not allowed to publish skills");

    // Narrowing to the chosen directories happens inside the snapshot, so a
    // repository holding more skills than one submission allows still works.
    const wanted = Array.isArray(dirs) && dirs.length ? dirs : undefined;
    const snapshot = await fetchRepoSnapshot(parseRepoUrl(url, ref), wanted);
    const selected = snapshot.skills;
    check(selected.length > 0, 400, "No matching skills found in the repository");

    // Pre-flight the whole submission before any write: every manifest must
    // name its skill, no name may repeat inside the submission, and no name
    // may already belong to another of this organisation's sources.
    const parsed = selected.map((skill) => {
      const { manifest } = runChecks(skill.files);
      return { skill, manifest, slug: manifest?.name ? String(manifest.name) : null };
    });
    const failures: { dir: string; slug: string | null; error: string }[] = [];
    const seen = new Map<string, string>();
    for (const p of parsed) {
      if (!p.slug) {
        failures.push({
          dir: p.skill.dir,
          slug: null,
          error: 'SKILL.md manifest with a "name" field is required',
        });
        continue;
      }
      const other = seen.get(p.slug);
      if (other !== undefined) {
        failures.push({
          dir: p.skill.dir,
          slug: p.slug,
          error: `Name "${p.slug}" repeats in this submission (also in "${other}")`,
        });
      }
      seen.set(p.slug, p.skill.dir);
    }
    const slugs = [...seen.keys()];
    const bound = slugs.length
      ? await sql`
          SELECT sk.slug FROM skills sk
          JOIN sources src ON src.id = sk.source_id
          WHERE sk.org_id = ${org.id} AND sk.slug = ANY(${slugs})
            AND src.url IS DISTINCT FROM ${snapshot.meta.url}`
      : [];
    for (const row of bound) {
      failures.push({
        dir: seen.get(row.slug as string) ?? "",
        slug: row.slug as string,
        error: `Name "${row.slug}" already belongs to another source in your organisation`,
      });
    }
    if (failures.length) {
      const reasons = failures.map((f) => `${f.slug ?? (f.dir || "?")}: ${f.error}`).join("; ");
      return NextResponse.json(
        { error: `Submission rejected; no skill was submitted. ${reasons}`, failures },
        { status: 409 },
      );
    }

    const { source, submission, results } = await sql.begin(async (tx) => {
      const src = await findOrCreateSource(tx as unknown as typeof sql, org.id, {
        url: snapshot.meta.url,
        owner: snapshot.meta.owner,
        repo: snapshot.meta.repo,
      });
      // A resubmission replaces this source's still-waiting submission.
      await tx`
        UPDATE versions SET status = 'superseded'
        WHERE submission_id IN
          (SELECT id FROM submissions WHERE source_id = ${src.id} AND status = 'submitted')`;
      await tx`
        UPDATE submissions SET status = 'superseded'
        WHERE source_id = ${src.id} AND status = 'submitted'`;
      const [sub] = await tx`
        INSERT INTO submissions (source_id, repo, submitted_by)
        VALUES (${src.id}, ${json(repoRecord(snapshot, ""))}, ${user!.id}) RETURNING *`;
      const created = [];
      for (const p of parsed) {
        const item = await createSubmission(
          {
            userId: user!.id,
            org: { id: org.id },
            sourceId: src.id,
            submissionId: sub.id,
            files: p.skill.files,
            version: deriveVersion(p.manifest, snapshot),
            repo: repoRecord(snapshot, p.skill.dir),
          },
          tx as unknown as typeof sql,
        );
        created.push({
          dir: p.skill.dir,
          slug: item.slug,
          status: item.version.status,
          version: item.version.version,
        });
      }
      return { source: src, submission: sub, results: created };
    });

    return {
      source: sourceView(source),
      submission: submissionView(submission),
      repo: { url: snapshot.meta.url, ref: snapshot.ref, commit: snapshot.commit },
      results,
    };
  },
  { roles: ["provider"] },
);
