import { sql } from "@/lib/db";
import { check, route } from "@/lib/handler";
import { hasMarketplaceService, marketplaceRequest } from "@/lib/marketplace-client";

export const GET = route<{ slug: string }>(async ({ params }) => {
  if (hasMarketplaceService) {
    return marketplaceRequest(`/v1/skills/${encodeURIComponent(params.slug)}`);
  }
  const [skill] = await sql`
    SELECT s.*, o.name AS org_name, o.website AS org_website, o.description AS org_description,
           o.status AS org_status, o.contact AS org_contact
    FROM skills s JOIN orgs o ON o.id = s.org_id
    WHERE s.slug = ${params.slug} AND s.status = 'published'`;
  check(skill, 404, "Skill not found or not published");
  const [version] = await sql`SELECT * FROM versions WHERE id = ${skill.published_version_id}`;
  const history = await sql`
    SELECT id, version, status, decided_at FROM versions
    WHERE skill_id = ${skill.id} AND status IN ('published','superseded') ORDER BY id DESC`;
  return {
    skill: { id: skill.id, slug: skill.slug, installs: skill.installs },
    org: { name: skill.org_name, website: skill.org_website, description: skill.org_description,
           status: skill.org_status, contact: skill.org_contact },
    version: { id: version.id, version: version.version, manifest: version.manifest,
               files: version.files, checks: version.checks, publishedAt: version.decided_at },
    history: history.map((h) => ({ id: h.id, version: h.version, status: h.status, publishedAt: h.decided_at })),
  };
});
