import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { check, route } from "@/lib/handler";
import { isUuid } from "@/lib/utils";
import { providerView } from "@/lib/views";
import {
  MarketplaceApiError,
  hasMarketplaceService,
  marketplaceRequest,
} from "@/lib/marketplace-client";

const CACHE = "public, max-age=60, s-maxage=300, stale-while-revalidate=86400";

// Public detail for a single approved provider (organisation), addressed by its
// slug. The UUID resolves too, so ids held by API clients keep working.
export const GET = route<{ slug: string }>(async ({ params }) => {
  const key = params.slug;
  check(key, 404, "Provider not found");

  if (hasMarketplaceService) {
    try {
      const data = await marketplaceRequest(`/v1/providers/${encodeURIComponent(key)}`);
      return NextResponse.json(data, { headers: { "Cache-Control": CACHE } });
    } catch (e) {
      if (e instanceof MarketplaceApiError && e.status === 404) {
        check(false, 404, "Provider not found");
      }
      throw e;
    }
  }

  const match = isUuid(key) ? sql`o.id = ${key}` : sql`o.slug = ${key}`;
  const [row] = await sql`
    SELECT o.id, o.name, o.slug, o.logo, o.website, o.description,
           count(s.id) FILTER (WHERE s.status = 'published') AS skill_count
    FROM orgs o
    LEFT JOIN skills s ON s.org_id = o.id
    WHERE ${match} AND o.status = 'approved'
      AND EXISTS (SELECT 1 FROM skills p WHERE p.org_id = o.id AND p.status = 'published')
    GROUP BY o.id`;
  check(row, 404, "Provider not found");
  return NextResponse.json(providerView(row), { headers: { "Cache-Control": CACHE } });
});
