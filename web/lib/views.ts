// Row-to-JSON shapers: snake_case DB rows become the camelCase API shapes.
/* eslint-disable @typescript-eslint/no-explicit-any */

export interface BundleFile {
  path: string;
  content: string;
}

export const orgView = (r: any) => ({
  id: r.id,
  name: r.name,
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
  type: r.type ?? "skill",
  status: r.status,
  official: r.official ?? false,
  publishedVersionId: r.published_version_id,
  installs: r.installs,
  createdAt: r.created_at,
});

export const applicationView = (r: any) => ({
  id: r.id,
  title: r.title,
  description: r.description ?? "",
  videoUrl: r.video_url ?? null,
  repoUrl: r.repo_url ?? null,
  skills: r.skills ?? [],
  usecases: r.usecases ?? [],
  status: r.status,
  createdAt: r.created_at,
  developer: { name: r.developer_name ?? "Developer" },
});

export function versionView(r: any, withFiles = false) {
  const files: BundleFile[] = r.files ?? [];
  return {
    id: r.id,
    skillId: r.skill_id,
    version: r.version,
    manifest: r.manifest,
    checks: r.checks,
    status: r.status,
    submittedBy: r.submitted_by,
    submittedAt: r.submitted_at,
    reviewerId: r.reviewer_id,
    reviewNotes: r.review_notes,
    decidedAt: r.decided_at,
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

export function chatView(r: any, full = false) {
  return {
    id: r.id,
    shareId: r.share_id,
    appUrl: r.share_id && r.app_html ? `/a/${r.share_id}` : null,
    title: r.title,
    model: r.model,
    skills: r.skills,
    messageCount: (r.messages ?? []).length,
    hasApp: r.app_html != null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    ...(full ? { messages: r.messages, appHtml: r.app_html } : {}),
  };
}

export function marketplaceEntry(r: any) {
  const manifest = r.manifest ?? {};
  return {
    id: r.id,
    slug: r.slug,
    type: r.type ?? "skill",
    status: r.status,
    official: r.official ?? false,
    installs: r.installs,
    org: { id: r.org_id, name: r.org_name, website: r.org_website },
    version: r.version,
    publishedAt: r.decided_at,
    description: manifest.description ?? "",
    license: manifest.license ?? "",
    protocols: manifest.targets?.protocols ?? [],
    journeyCount: Array.isArray(manifest.journeys) ? manifest.journeys.length : 0,
    usesSkills: manifest.uses_skills ?? [],
  };
}
