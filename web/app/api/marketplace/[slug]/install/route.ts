import { sql } from "@/lib/db";
import { check, route } from "@/lib/handler";
import { hasMarketplaceService, marketplaceRequest } from "@/lib/marketplace-client";

export const POST = route<{ slug: string }>(async ({ params }) => {
  if (hasMarketplaceService) {
    return marketplaceRequest(`/v1/skills/${encodeURIComponent(params.slug)}/install`, {
      method: "POST",
    });
  }
  const [row] = await sql`
    UPDATE skills SET installs = installs + 1
    WHERE slug = ${params.slug} AND status = 'published' RETURNING installs`;
  check(row, 404, "Skill not found");
  return { installs: row.installs };
});
