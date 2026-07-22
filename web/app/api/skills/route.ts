import { sql, logEvent, json } from "@/lib/db";
import { runChecks } from "@/lib/checks";
import { check, route } from "@/lib/handler";
import { isUuid } from "@/lib/utils";
import { skillView, versionView, type BundleFile } from "@/lib/views";

const MAX_BUNDLE_BYTES = 2 * 1024 * 1024;

export const POST = route(
  async ({ user, body }) => {
    const { orgId, files } = await body<{ orgId: string; files: BundleFile[] }>();
    check(
      Array.isArray(files) && files.length > 0,
      400,
      "files[] is required: [{ path, content }]",
    );
    for (const f of files)
      check(!f.path.includes("..") && !f.path.startsWith("/"), 400, `Illegal path: ${f.path}`);
    check(
      files.reduce((n, f) => n + f.content.length, 0) <= MAX_BUNDLE_BYTES,
      400,
      "Bundle exceeds the 2 MB limit",
    );

    check(isUuid(orgId), 404, "Organisation not found");
    const [org] = await sql`SELECT * FROM orgs WHERE id = ${orgId} AND owner_id = ${user!.id}`;
    check(org, 404, "Organisation not found");
    check(
      org.status === "approved",
      403,
      "Your organisation must be approved before publishing skills",
    );

    const { checks, passed, manifest } = runChecks(files);
    check(manifest?.name, 400, 'SKILL.md manifest with a "name" field is required');
    const slug = String(manifest.name);
    const type = manifest.type === "usecase" ? "usecase" : "skill";

    let [skill] = await sql`SELECT * FROM skills WHERE slug = ${slug}`;
    check(
      !skill || skill.org_id === org.id,
      409,
      `Name "${slug}" is owned by another organisation`,
    );
    if (!skill)
      [skill] =
        await sql`INSERT INTO skills (slug, org_id, type) VALUES (${slug}, ${org.id}, ${type}) RETURNING *`;

    const status = passed ? "submitted" : "checks_failed";
    const [version] = await sql`
    INSERT INTO versions (skill_id, version, manifest, files, checks, status, submitted_by)
    VALUES (${skill.id}, ${String(manifest.version ?? "unversioned")}, ${json(manifest)},
            ${json(files)}, ${json(checks)}, ${status}, ${user!.id})
    RETURNING *`;
    await logEvent(
      passed ? "skill.submitted" : "skill.checks_failed",
      user!.id,
      { skillId: skill.id, versionId: version.id },
      { slug, version: version.version },
    );
    return { skill: skillView(skill), version: versionView(version) };
  },
  { roles: ["provider"] },
);
