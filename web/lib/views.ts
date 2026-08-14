// Row-to-JSON shapers: snake_case DB rows become the camelCase API shapes.
/* eslint-disable @typescript-eslint/no-explicit-any */

export interface BundleFile {
  path: string;
  content: string;
}

export const orgView = (r: any) => ({
  id: r.id,
  name: r.name,
  slug: r.slug ?? null,
  logo: r.logo ?? null,
  cover: r.cover ?? null,
  website: r.website,
  description: r.description,
  contact: r.contact,
  status: r.status,
  ownerId: r.owner_id,
  createdAt: r.created_at,
  decidedAt: r.decided_at,
  decisionNotes: r.decision_notes,
});

export const skillView = (r: any) => ({
  id: r.id,
  slug: r.slug,
  orgId: r.org_id,
  sourceId: r.source_id ?? null,
  status: r.status,
  publishedVersionId: r.published_version_id,
  createdAt: r.created_at,
});

export const sourceView = (r: any) => ({
  id: r.id,
  orgId: r.org_id,
  url: r.url ?? null,
  owner: r.owner ?? null,
  repo: r.repo ?? null,
  status: r.status,
  createdAt: r.created_at,
});

export const submissionView = (r: any) => ({
  id: r.id,
  sourceId: r.source_id,
  status: r.status,
  repo: r.repo ?? null,
  submittedBy: r.submitted_by,
  submittedAt: r.submitted_at,
  reviewerId: r.reviewer_id,
  reviewNotes: r.review_notes,
  decidedAt: r.decided_at,
});

export function versionView(r: any, withFiles = false) {
  const files: BundleFile[] = r.files ?? [];
  return {
    id: r.id,
    skillId: r.skill_id,
    submissionId: r.submission_id ?? null,
    version: r.version,
    manifest: r.manifest,
    checks: r.checks,
    status: r.status,
    submittedBy: r.submitted_by,
    submittedAt: r.submitted_at,
    reviewerId: r.reviewer_id,
    reviewNotes: r.review_notes,
    decidedAt: r.decided_at,
    repo: r.repo ?? null,
    fileCount: files.length,
    filePaths: files.map((f) => f.path),
    ...(withFiles ? { files } : {}),
  };
}

export const publicUser = (r: any) => ({
  id: r.id,
  email: r.email,
  name: r.name,
  role: r.role,
  status: r.status,
  avatar: r.settings?.avatar ?? null,
  createdAt: r.created_at ?? r.createdAt ?? null,
});

// Protocols may be a top-level targets.protocols array (legacy) or a
// comma-separated string under spec-conformant metadata.protocols.
export function manifestProtocols(m: any): string[] {
  if (Array.isArray(m?.targets?.protocols)) return m.targets.protocols;
  const p = m?.metadata?.protocols;
  return typeof p === "string" ? p.split(/\s*,\s*/).filter(Boolean) : [];
}

export function providerView(r: any) {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug ?? null,
    logo: r.logo ?? null,
    website: r.website,
    description: r.description ?? "",
    skillCount: Number(r.skill_count),
  };
}

export function marketplaceEntry(r: any) {
  const manifest = r.manifest ?? {};
  const repo = r.repo ?? null;
  return {
    id: r.id,
    slug: r.slug,
    status: r.status,
    source: r.source_id
      ? {
          id: r.source_id,
          url: r.source_url ?? null,
          owner: r.source_owner ?? null,
          repo: r.source_repo ?? null,
          status: r.source_status ?? "active",
        }
      : null,
    repo: repo
      ? {
          url: repo.url,
          owner: repo.owner,
          repo: repo.repo,
          dir: repo.dir ?? "",
          stars: repo.stars ?? 0,
        }
      : null,
    org: { id: r.org_id, slug: r.org_slug ?? null, name: r.org_name, website: r.org_website },
    version: r.version,
    publishedAt: r.decided_at,
    description: manifest.description ?? "",
    license: manifest.license ?? "",
    protocols: manifestProtocols(manifest),
  };
}
