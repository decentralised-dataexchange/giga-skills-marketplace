// Public detail for a published skill. Skill names are unique per
// organisation, so a bare slug can have several published owners; without a
// ?provider= qualifier the route then answers with the list of homes instead
// of one detail, and the caller picks.
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { check, route } from "@/lib/handler";
import { isUuid } from "@/lib/utils";
import { skillPath } from "@/lib/routes";
import { hasMarketplaceService, marketplaceRequest } from "@/lib/marketplace-client";

const CACHE = {
  "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
};

export const GET = route<{ slug: string }>(async ({ req, params }) => {
  const provider = new URL(req.url).searchParams.get("provider") ?? "";

  if (hasMarketplaceService) {
    const qs = provider ? `?provider=${encodeURIComponent(provider)}` : "";
    const data = await marketplaceRequest(`/v1/skills/${encodeURIComponent(params.slug)}${qs}`);
    return NextResponse.json(data, { headers: CACHE });
  }

  const provCond = !provider
    ? sql``
    : isUuid(provider)
      ? sql`AND o.id = ${provider}`
      : sql`AND o.slug = ${provider}`;
  const matches = await sql`
    SELECT s.*, o.name AS org_name, o.slug AS org_slug, o.logo AS org_logo, o.website AS org_website,
           o.description AS org_description, o.status AS org_status, o.contact AS org_contact,
           src.url AS source_url, src.owner AS source_owner, src.repo AS source_repo,
           src.status AS source_status,
           pv.version AS pub_version, pv.decided_at AS pub_decided_at
    FROM skills s
    JOIN orgs o ON o.id = s.org_id
    LEFT JOIN sources src ON src.id = s.source_id
    LEFT JOIN versions pv ON pv.id = s.published_version_id
    WHERE s.slug = ${params.slug} AND s.status = 'published' AND o.status = 'approved'
      AND (src.id IS NULL OR src.status = 'active') ${provCond}
    ORDER BY pv.decided_at DESC NULLS LAST`;
  check(matches.length, 404, "Skill not found or not published");

  if (matches.length > 1) {
    // Several providers publish this name; the caller must qualify.
    return NextResponse.json(
      {
        multiple: true,
        matches: matches.map((m) => ({
          slug: m.slug,
          org: { slug: m.org_slug ?? null, name: m.org_name, logo: m.org_logo ?? null },
          source: m.source_repo ?? null,
          version: m.pub_version,
          publishedAt: m.pub_decided_at,
          path: skillPath(m.org_slug, m.source_repo ?? "bundles", m.slug),
        })),
      },
      { headers: CACHE },
    );
  }

  const skill = matches[0];
  const [version] = await sql`SELECT * FROM versions WHERE id = ${skill.published_version_id}`;
  const history = await sql`
    SELECT id, version, status, decided_at FROM versions
    WHERE skill_id = ${skill.id} AND status IN ('published','superseded')
    ORDER BY submitted_at DESC`;
  return NextResponse.json(
    {
      skill: {
        id: skill.id,
        slug: skill.slug,
      },
      org: {
        name: skill.org_name,
        slug: skill.org_slug ?? null,
        logo: skill.org_logo ?? null,
        website: skill.org_website,
        description: skill.org_description,
        status: skill.org_status,
        contact: skill.org_contact,
      },
      source: skill.source_id
        ? {
            id: skill.source_id,
            url: skill.source_url,
            owner: skill.source_owner,
            repo: skill.source_repo,
            status: skill.source_status,
          }
        : null,
      version: {
        id: version.id,
        version: version.version,
        manifest: version.manifest,
        files: version.files,
        checks: version.checks,
        repo: version.repo ?? null,
        publishedAt: version.decided_at,
      },
      history: history.map((h) => ({
        id: h.id,
        version: h.version,
        status: h.status,
        publishedAt: h.decided_at,
      })),
    },
    { headers: CACHE },
  );
});
