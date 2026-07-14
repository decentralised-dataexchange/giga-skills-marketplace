import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { check, route } from "@/lib/handler";
import { providerView } from "@/lib/views";
import {
  MarketplaceApiError,
  hasMarketplaceService,
  marketplaceRequest,
} from "@/lib/marketplace-client";

const CACHE = "public, max-age=60, s-maxage=300, stale-while-revalidate=86400";

// Public detail for a single approved provider (organisation).
export const GET = route<{ id: string }>(async ({ params }) => {
  const id = Number(params.id);
  check(Number.isInteger(id) && id > 0, 404, "Provider not found");

  if (hasMarketplaceService) {
    try {
      const data = await marketplaceRequest(`/v1/providers/${id}`);
      return NextResponse.json(data, { headers: { "Cache-Control": CACHE } });
    } catch (e) {
      if (e instanceof MarketplaceApiError && e.status === 404) {
        check(false, 404, "Provider not found");
      }
      throw e;
    }
  }

  const [row] = await sql`
    SELECT o.id, o.name, o.slug, o.website, o.description,
           count(s.id) FILTER (WHERE s.type = 'skill' AND s.status = 'published') AS skill_count,
           count(s.id) FILTER (WHERE s.type = 'usecase' AND s.status = 'published') AS usecase_count
    FROM orgs o
    LEFT JOIN skills s ON s.org_id = o.id
    WHERE o.id = ${id} AND o.status = 'approved'
    GROUP BY o.id`;
  check(row, 404, "Provider not found");
  return NextResponse.json(providerView(row), { headers: { "Cache-Control": CACHE } });
});
