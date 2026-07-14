import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { route } from "@/lib/handler";
import { providerView } from "@/lib/views";
import { hasMarketplaceService, marketplaceRequest } from "@/lib/marketplace-client";

const CACHE = "public, max-age=60, s-maxage=300, stale-while-revalidate=86400";

// Public listing of approved providers (organisations) with published catalog counts.
export const GET = route(async ({ req }) => {
  const u = new URL(req.url);
  const q = u.searchParams.get("q")?.toLowerCase().trim() ?? "";
  const page = Math.max(1, Number(u.searchParams.get("page")) || 1);
  const pageSize = Math.min(48, Math.max(1, Number(u.searchParams.get("pageSize")) || 12));

  if (hasMarketplaceService) {
    const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (q) qs.set("q", q);
    const data = await marketplaceRequest(`/v1/providers?${qs.toString()}`);
    return NextResponse.json(data, { headers: { "Cache-Control": CACHE } });
  }

  const like = `%${q}%`;
  const qCond = q ? sql`AND lower(o.name) LIKE ${like}` : sql``;
  const rows = await sql`
    SELECT o.id, o.name, o.slug, o.website, o.description,
           count(s.id) FILTER (WHERE s.type = 'skill' AND s.status = 'published') AS skill_count,
           count(s.id) FILTER (WHERE s.type = 'usecase' AND s.status = 'published') AS usecase_count
    FROM orgs o
    LEFT JOIN skills s ON s.org_id = o.id
    WHERE o.status = 'approved' ${qCond}
    GROUP BY o.id
    ORDER BY skill_count DESC, o.name ASC
    LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`;
  const [{ n: total }] = await sql`
    SELECT count(*)::int AS n FROM orgs o WHERE o.status = 'approved' ${qCond}`;
  return NextResponse.json(
    { providers: rows.map(providerView), total, page, pageSize },
    { headers: { "Cache-Control": CACHE } },
  );
});
