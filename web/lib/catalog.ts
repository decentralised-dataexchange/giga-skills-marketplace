// Server-side catalog lookups used by the provider-agnostic redirect routes.
import { ensureReady, sql } from "./db";
import {
  hasMarketplaceService,
  MarketplaceApiError,
  marketplaceRequest,
} from "./marketplace-client";
import { skillPath, usecasePath } from "./routes";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Canonical, provider-scoped path for a published skill or use case, or null
 * when nothing published owns the slug.
 */
export async function canonicalCatalogPath(slug: string): Promise<string | null> {
  const entry = await publishedEntry(slug);
  if (!entry?.provider) return null;
  return entry.type === "usecase"
    ? usecasePath(entry.provider, slug)
    : skillPath(entry.provider, slug);
}

async function publishedEntry(
  slug: string,
): Promise<{ provider: string | null; type: string } | null> {
  if (hasMarketplaceService) {
    try {
      const detail = await marketplaceRequest<any>(`/v1/skills/${encodeURIComponent(slug)}`);
      return { provider: detail?.org?.slug ?? null, type: detail?.skill?.type ?? "skill" };
    } catch (e) {
      if (e instanceof MarketplaceApiError && e.status === 404) return null;
      throw e;
    }
  }

  await ensureReady();
  const [row] = await sql`
    SELECT s.type, o.slug AS provider
    FROM skills s JOIN orgs o ON o.id = s.org_id
    WHERE s.slug = ${slug} AND s.status = 'published'`;
  return row ? { provider: (row.provider as string) ?? null, type: row.type as string } : null;
}
