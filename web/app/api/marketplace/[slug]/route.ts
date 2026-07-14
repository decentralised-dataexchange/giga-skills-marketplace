import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { check, route } from "@/lib/handler";
import { hasMarketplaceService, marketplaceRequest } from "@/lib/marketplace-client";

export const GET = route<{ slug: string }>(async ({ params }) => {
  if (hasMarketplaceService) {
    const data = await marketplaceRequest(`/v1/skills/${encodeURIComponent(params.slug)}`);
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
      },
    });
  }
  const [skill] = await sql`
    SELECT s.*, o.name AS org_name, o.slug AS org_slug, o.website AS org_website,
           o.description AS org_description, o.status AS org_status, o.contact AS org_contact
    FROM skills s JOIN orgs o ON o.id = s.org_id
    WHERE s.slug = ${params.slug} AND s.status = 'published'`;
  check(skill, 404, "Skill not found or not published");
  const [version] = await sql`SELECT * FROM versions WHERE id = ${skill.published_version_id}`;
  const history = await sql`
    SELECT id, version, status, decided_at FROM versions
    WHERE skill_id = ${skill.id} AND status IN ('published','superseded') ORDER BY id DESC`;
  return NextResponse.json(
    {
      skill: {
        id: skill.id,
        slug: skill.slug,
        type: skill.type ?? "skill",
        installs: skill.installs,
        official: skill.official ?? false,
      },
      org: {
        name: skill.org_name,
        slug: skill.org_slug ?? null,
        website: skill.org_website,
        description: skill.org_description,
        status: skill.org_status,
        contact: skill.org_contact,
      },
      version: {
        id: version.id,
        version: version.version,
        manifest: version.manifest,
        files: version.files,
        checks: version.checks,
        publishedAt: version.decided_at,
      },
      history: history.map((h) => ({
        id: h.id,
        version: h.version,
        status: h.status,
        publishedAt: h.decided_at,
      })),
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
      },
    },
  );
});
