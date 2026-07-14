import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { route } from "@/lib/handler";
import { marketplaceEntry } from "@/lib/views";
import { hasMarketplaceService, marketplaceRequest } from "@/lib/marketplace-client";

export const GET = route(async ({ req }) => {
  const u = new URL(req.url);
  const q = u.searchParams.get("q")?.toLowerCase().trim() ?? "";
  const type = u.searchParams.get("type") ?? "";
  const provider = u.searchParams.get("provider") ?? "";
  const page = Math.max(1, Number(u.searchParams.get("page")) || 1);
  const pageSize = Math.min(48, Math.max(1, Number(u.searchParams.get("pageSize")) || 12));

  if (hasMarketplaceService) {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (type) qs.set("type", type);
    if (provider) qs.set("provider", provider);
    qs.set("page", String(page));
    qs.set("pageSize", String(pageSize));
    const data = await marketplaceRequest(`/v1/skills?${qs.toString()}`);
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
      },
    });
  }

  const like = `%${q}%`;
  const providerId = Number(provider);
  const typeCond = type === "skill" || type === "usecase" ? sql`AND s.type = ${type}` : sql``;
  const provCond = Number.isInteger(providerId) ? sql`AND s.org_id = ${providerId}` : sql``;
  const qCond = q
    ? sql`AND (lower(s.slug) LIKE ${like} OR lower(o.name) LIKE ${like} OR lower(coalesce(v.manifest->>'description','')) LIKE ${like})`
    : sql``;
  const rows = await sql`
    SELECT s.id, s.slug, s.type, s.status, s.official, s.installs,
           o.id AS org_id, o.name AS org_name, o.website AS org_website,
           v.version, v.manifest, v.decided_at
    FROM skills s
    JOIN orgs o ON o.id = s.org_id
    JOIN versions v ON v.id = s.published_version_id
    WHERE s.status = 'published' ${typeCond} ${provCond} ${qCond}
    ORDER BY v.decided_at DESC NULLS LAST, s.id DESC
    LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`;
  const [{ n: total }] = await sql`
    SELECT count(*)::int AS n
    FROM skills s
    JOIN orgs o ON o.id = s.org_id
    JOIN versions v ON v.id = s.published_version_id
    WHERE s.status = 'published' ${typeCond} ${provCond} ${qCond}`;
  return NextResponse.json(
    { skills: rows.map(marketplaceEntry), total, page, pageSize },
    {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
      },
    },
  );
});
