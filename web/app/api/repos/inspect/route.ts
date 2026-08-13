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

    // Which discovered names already exist, and whether the caller owns them.
    const slugs = inspected.map((s) => s.slug).filter((s): s is string => !!s);
    const existing = slugs.length
      ? await sql`SELECT slug, org_id FROM skills WHERE slug = ANY(${slugs})`
      : [];
    const bySlug = new Map(existing.map((r) => [r.slug as string, r.org_id as string]));

    return {
      repo,
      skills: inspected.map((s) => ({
        ...s,
        existing: !!(s.slug && bySlug.has(s.slug)),
        conflict: !!(s.slug && bySlug.has(s.slug) && !myOrgIds.has(bySlug.get(s.slug)!)),
      })),
    };
  },
  { roles: ["provider"] },
);
