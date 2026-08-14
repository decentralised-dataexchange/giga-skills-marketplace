// Skill sources: one record per (organisation, repository url). The record is
// the aggregate that submissions, review decisions, and delisting act on.
// A NULL url is the organisation's pseudo-source for direct file submissions
// (public catalog segment "bundles").
import { sql } from "@/lib/db";

export interface SourceMeta {
  url: string;
  owner: string;
  repo: string;
}

/**
 * Find the organisation's source for this repository (or its pseudo-source
 * when meta is null), creating it when missing. A delisted source is reused,
 * not recreated: resubmission is the road back to the catalog.
 */
export async function findOrCreateSource(db: typeof sql, orgId: string, meta: SourceMeta | null) {
  await db`
    INSERT INTO sources (org_id, url, owner, repo)
    VALUES (${orgId}, ${meta?.url ?? null}, ${meta?.owner ?? null}, ${meta?.repo ?? null})
    ON CONFLICT (org_id, COALESCE(url, 'direct')) DO NOTHING`;
  const [source] = await db`
    SELECT * FROM sources
    WHERE org_id = ${orgId} AND COALESCE(url, 'direct') = ${meta?.url ?? "direct"}`;
  return source;
}
