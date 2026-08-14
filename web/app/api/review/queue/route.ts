// The review queue lists source submissions, not individual skills: one row
// per publish action, decided as a whole.
import { sql } from "@/lib/db";
import { GOVERNANCE_ROLES } from "@/lib/auth";
import { route } from "@/lib/handler";
import { submissionView } from "@/lib/views";

export const GET = route(
  async () => {
    const rows = await sql`
    SELECT sub.*,
           src.url AS source_url, src.owner AS source_owner, src.repo AS source_repo,
           src.status AS source_status,
           o.name AS org_name, o.slug AS org_slug, ru.name AS reviewer_name,
           (SELECT count(*)::int FROM versions v WHERE v.submission_id = sub.id) AS skill_count,
           (SELECT coalesce(array_agg(sk.slug ORDER BY sk.slug), '{}') FROM versions v
              JOIN skills sk ON sk.id = v.skill_id
              WHERE v.submission_id = sub.id) AS slugs
    FROM submissions sub
    JOIN sources src ON src.id = sub.source_id
    JOIN orgs o ON o.id = src.org_id
    LEFT JOIN users ru ON ru.id = sub.reviewer_id
    WHERE sub.status IN ('submitted','in_review') ORDER BY sub.submitted_at`;
    return {
      queue: rows.map((r) => ({
        ...submissionView(r),
        source: {
          id: r.source_id,
          url: r.source_url,
          owner: r.source_owner,
          repo: r.source_repo,
          status: r.source_status,
        },
        orgName: r.org_name,
        orgSlug: r.org_slug,
        reviewerName: r.reviewer_name,
        skillCount: r.skill_count,
        slugs: r.slugs ?? [],
      })),
    };
  },
  { roles: GOVERNANCE_ROLES },
);
