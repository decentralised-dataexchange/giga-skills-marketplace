// Preview a public GitHub repository as skill submissions: resolve the ref,
// discover every SKILL.md directory, run the automated checks. No writes.
// A repository holding more skills than one submission allows answers with
// the directory list instead, so the provider can pick a subset to inspect.
import { sql } from "@/lib/db";
import { runChecks } from "@/lib/checks";
import { route } from "@/lib/handler";
import {
  SKILLS_PER_SUBMISSION,
  deriveVersion,
  parseRepoUrl,
  resolveRepoTree,
  snapshotFromTree,
} from "@/lib/github";

export const POST = route(
  async ({ user, body }) => {
    const { url, ref, dirs } = await body<{ url: string; ref?: string; dirs?: string[] }>();
    const tree = await resolveRepoTree(parseRepoUrl(url, ref));
    const repo = { ...tree.meta, ref: tree.ref, commit: tree.commit };

    const chosen = Array.isArray(dirs) && dirs.length ? dirs : undefined;
    if (!chosen && tree.roots.length > SKILLS_PER_SUBMISSION) {
      return { repo, tooMany: true, limit: SKILLS_PER_SUBMISSION, dirs: tree.roots };
    }

    const snapshot = await snapshotFromTree(tree, chosen);

    const orgs = await sql`SELECT id FROM orgs WHERE owner_id = ${user!.id}`;
    const myOrgIds = new Set(orgs.map((o) => o.id as string));

    const inspected = snapshot.skills.map((skill) => {
      const { checks, passed, manifest } = runChecks(skill.files);
      return {
        dir: skill.dir,
        slug: manifest?.name ? String(manifest.name) : null,
        description: manifest?.description ? String(manifest.description) : "",
        version: deriveVersion(manifest, snapshot),
        checks,
        passed,
        fileCount: skill.files.length,
        filePaths: skill.files.map((f) => f.path),
        skippedFiles: skill.skipped,
      };
    });

    // Which discovered names this organisation already uses, and from which
    // source. Another organisation using the same name is no conflict: skill
    // names are unique per organisation, not across the catalog.
    const orgIds = [...myOrgIds];
    const slugs = inspected.map((s) => s.slug).filter((s): s is string => !!s);
    const existing = slugs.length
      ? await sql`
          SELECT sk.slug, sk.source_id, src.url AS source_url FROM skills sk
          LEFT JOIN sources src ON src.id = sk.source_id
          WHERE sk.org_id = ANY(${orgIds}) AND sk.slug = ANY(${slugs})`
      : [];
    // A row without a source (from before first-class sources) is adoptable
    // by any of the organisation's sources, so it counts as existing.
    const bySlug = new Map(
      existing.map((r) => [
        r.slug as string,
        { adoptable: !r.source_id, url: r.source_url as string | null },
      ]),
    );

    // The caller's source record for this repository, if any: a delisted one
    // signals that an approved resubmission relists it.
    const [mySource] = await sql`
      SELECT status FROM sources WHERE org_id = ANY(${orgIds}) AND url = ${tree.meta.url}`;

    return {
      repo,
      sourceStatus: (mySource?.status as string | undefined) ?? null,
      skills: inspected.map((s) => {
        const bound = s.slug ? bySlug.get(s.slug) : undefined;
        const mine = !!bound && (bound.adoptable || bound.url === tree.meta.url);
        return { ...s, existing: mine, conflict: !!bound && !mine };
      }),
    };
  },
  { roles: ["provider"] },
);
