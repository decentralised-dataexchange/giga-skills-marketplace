// Server-side catalog lookups used by the provider-agnostic redirect routes.
// Skill names are unique per organisation, so one slug can have several
// published homes; the redirect only fires when the home is unambiguous.
import { ensureReady, sql } from "./db";
import {
  hasMarketplaceService,
  MarketplaceApiError,
  marketplaceRequest,
} from "./marketplace-client";
import { skillPath } from "./routes";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface CatalogHome {
  provider: string;
  providerName: string;
  providerLogo: string | null;
  source: string;
  version: string | null;
  publishedAt: string | null;
  path: string;
}

/**
 * Canonical, provider- and source-scoped path for a published skill; null
 * when nothing published owns the slug, or when several providers do (the
 * caller then lists the homes and lets the visitor choose).
 */
export async function canonicalCatalogPath(slug: string): Promise<string | null> {
  const homes = await catalogHomes(slug);
  return homes.length === 1 ? homes[0].path : null;
}

/** Every published home of a slug, one per owning provider. */
export async function catalogHomes(slug: string): Promise<CatalogHome[]> {
  if (hasMarketplaceService) {
    try {
      const detail = await marketplaceRequest<any>(`/v1/skills/${encodeURIComponent(slug)}`);
      if (detail?.multiple) {
        return (detail.matches ?? []).map((m: any) => home(slug, m.org ?? m.provider, m));
      }
      if (!detail?.org?.slug) return [];
      return [
        home(slug, detail.org, {
          source: detail.source?.repo ?? detail.version?.repo?.repo ?? null,
          version: detail.version?.version ?? null,
          publishedAt: detail.version?.publishedAt ?? null,
        }),
      ];
    } catch (e) {
      if (e instanceof MarketplaceApiError && e.status === 404) return [];
      throw e;
    }
  }

  await ensureReady();
  const rows = await sql`
    SELECT o.slug AS provider, o.name AS provider_name, o.logo AS provider_logo,
           COALESCE(src.repo, (pv.repo->>'repo')) AS source_repo,
           pv.version, pv.decided_at
    FROM skills s
    JOIN orgs o ON o.id = s.org_id
    LEFT JOIN sources src ON src.id = s.source_id
    LEFT JOIN versions pv ON pv.id = s.published_version_id
    WHERE s.slug = ${slug} AND s.status = 'published' AND o.status = 'approved'
      AND (src.id IS NULL OR src.status = 'active')
    ORDER BY pv.decided_at DESC NULLS LAST`;
  return rows
    .filter((r) => r.provider)
    .map((r) =>
      home(
        slug,
        {
          slug: r.provider,
          name: r.provider_name,
          logo: r.provider_logo,
        },
        {
          source: r.source_repo,
          version: r.version,
          publishedAt: r.decided_at,
        },
      ),
    );
}

function home(slug: string, org: any, m: any): CatalogHome {
  const source = m?.source ?? "bundles";
  return {
    provider: org.slug,
    providerName: org.name ?? org.slug,
    providerLogo: org.logo ?? null,
    source: source || "bundles",
    version: m?.version ?? null,
    publishedAt: m?.publishedAt ?? m?.decided_at ?? null,
    path: skillPath(org.slug, source || "bundles", slug),
  };
}
