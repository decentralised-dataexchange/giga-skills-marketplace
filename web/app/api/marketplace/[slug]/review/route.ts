import { sql } from "@/lib/db";
import { check, route } from "@/lib/handler";

// Public review trail for a published skill: the automated check report plus the
// human approval / provenance events. Served from the web app (not the catalog
// service) because it reads the governance audit log. Emails are never exposed.
const TRAIL_TYPES = ["review.approve", "review.reject", "review.request_changes", "skill.official_set", "skill.delisted"];

export const GET = route<{ slug: string }>(async ({ params }) => {
  const [skill] = await sql`
    SELECT id, slug, official, published_version_id FROM skills
    WHERE slug = ${params.slug} AND status = 'published'`;
  check(skill, 404, "Skill not found or not published");

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
    ORDER BY e.id ASC`;

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
    skill: { slug: skill.slug, official: skill.official ?? false },
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
