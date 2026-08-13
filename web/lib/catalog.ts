// Server-side catalog lookups used by the provider-agnostic redirect routes.
import { ensureReady, sql } from "./db";
import {
  hasMarketplaceService,
  MarketplaceApiError,
  marketplaceRequest,
} from "./marketplace-client";
import { skillPath } from "./routes";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Canonical, provider- and source-scoped path for a published skill, or null
 * when nothing published owns the slug.
 */
export async function canonicalCatalogPath(slug: string): Promise<string | null> {
  const home = await publishedHome(slug);
  return home ? skillPath(home.provider, home.source, slug) : null;
}

async function publishedHome(slug: string): Promise<{ provider: string; source: string } | null> {
  if (hasMarketplaceService) {
    try {
      const detail = await marketplaceRequest<any>(`/v1/skills/${encodeURIComponent(slug)}`);
      const provider = detail?.org?.slug ?? null;
      if (!provider) return null;
      return { provider, source: detail?.version?.repo?.repo ?? "bundles" };
    } catch (e) {
      if (e instanceof MarketplaceApiError && e.status === 404) return null;
      throw e;
    }
  }

  await ensureReady();
  const [row] = await sql`
    SELECT o.slug AS provider, v.repo AS repo
    FROM skills s
    JOIN orgs o ON o.id = s.org_id
    LEFT JOIN versions v ON v.id = s.published_version_id
    WHERE s.slug = ${slug} AND s.status = 'published'`;
  if (!row?.provider) return null;
  return { provider: row.provider as string, source: (row.repo as any)?.repo ?? "bundles" };
}
