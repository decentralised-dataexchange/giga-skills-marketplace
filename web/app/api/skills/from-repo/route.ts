// Submit every skill found in a public GitHub repository (optionally a chosen
// subset of directories) for review. The server re-fetches the repository
// itself, pinned to the resolved commit, so the stored files and repository
// metadata are marketplace-verified. Resubmitting the same repository at a new
// commit or tag creates fresh versions that go through review again.
import { sql } from "@/lib/db";
import { check, route } from "@/lib/handler";
import { isUuid } from "@/lib/utils";
import { deriveVersion, fetchRepoSnapshot, parseRepoUrl, repoRecord } from "@/lib/github";
import { runChecks } from "@/lib/checks";
import { createSubmission } from "@/lib/submit";

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

    const results = [];
    for (const skill of selected) {
      const { manifest } = runChecks(skill.files);
      try {
        const created = await createSubmission({
          userId: user!.id,
          org: { id: org.id },
          files: skill.files,
          version: deriveVersion(manifest, snapshot),
          repo: repoRecord(snapshot, skill.dir),
        });
        results.push({
          dir: skill.dir,
          slug: created.slug,
          status: created.version.status,
          version: created.version.version,
        });
      } catch (err) {
        results.push({
          dir: skill.dir,
          slug: manifest?.name ? String(manifest.name) : null,
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    return {
      repo: { url: snapshot.meta.url, ref: snapshot.ref, commit: snapshot.commit },
      results,
    };
  },
  { roles: ["provider"] },
);
