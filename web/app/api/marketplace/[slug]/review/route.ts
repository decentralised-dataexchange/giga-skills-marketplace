import { sql } from "@/lib/db";
import { check, route } from "@/lib/handler";
import { isUuid } from "@/lib/utils";

// Public review trail for a published skill: the automated check report plus the
// human approval / provenance events. Served from the web app (not the catalog
// service) because it reads the governance audit log. Emails are never exposed.
const TRAIL_TYPES = [
  "review.approve",
  "review.reject",
  "review.request_changes",
  "skill.official_set",
  "skill.delisted",
];

export const GET = route<{ slug: string }>(async ({ req, params }) => {
  // Delisting removes a skill from the catalog without rewriting its history:
  // the trail stays public. Skill names are unique per organisation, so a
  // ?provider= qualifier picks the owner when several publish the same name.
  const provider = new URL(req.url).searchParams.get("provider") ?? "";
  const provCond = !provider
    ? sql``
    : isUuid(provider)
      ? sql`AND o.id = ${provider}`
      : sql`AND o.slug = ${provider}`;
  const skills = await sql`
    SELECT s.id, s.slug, s.status, s.published_version_id FROM skills s
    JOIN orgs o ON o.id = s.org_id
    WHERE s.slug = ${params.slug} AND s.status IN ('published','delisted')
      AND s.published_version_id IS NOT NULL ${provCond}`;
  check(skills.length, 404, "Skill not found or not published");
  check(
    skills.length === 1,
    409,
    "Several providers publish this name; qualify the request with ?provider=",
  );
  const [skill] = skills;

  const [version] = await sql`
    SELECT v.version, v.checks, v.review_notes, v.submitted_at, v.decided_at,
           su.name AS submitter_name, rv.name AS reviewer_name
    FROM versions v
    LEFT JOIN users su ON su.id = v.submitted_by
    LEFT JOIN users rv ON rv.id = v.reviewer_id
    WHERE v.id = ${skill.published_version_id}`;

  const events = await sql`
    SELECT e.type, e.detail, e.at, u.name AS actor_name, u.role AS actor_role
    FROM events e LEFT JOIN users u ON u.id = e.actor_id
    WHERE e.subject->>'skillId' = ${String(skill.id)} AND e.type = ANY(${TRAIL_TYPES})
    ORDER BY e.at ASC`;

  const trail = [
    version.submitted_at && {
      type: "skill.submitted",
      at: version.submitted_at,
      actor: { name: version.submitter_name ?? "Provider", role: "provider" },
      detail: {},
    },
    ...events.map((e) => ({
      type: e.type,
      at: e.at,
      actor: { name: e.actor_name ?? "system", role: e.actor_role ?? null },
      detail: e.detail ?? {},
    })),
  ].filter(Boolean);

  return {
    skill: { slug: skill.slug, status: skill.status },
    version: {
      version: version.version,
      checks: version.checks,
      reviewNotes: version.review_notes,
      submittedAt: version.submitted_at,
      decidedAt: version.decided_at,
      submitterName: version.submitter_name,
      reviewerName: version.reviewer_name,
    },
    trail,
  };
});
