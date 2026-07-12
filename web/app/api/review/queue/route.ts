import { sql } from "@/lib/db";
import { GOVERNANCE_ROLES } from "@/lib/auth";
import { route } from "@/lib/handler";
import { versionView } from "@/lib/views";

export const GET = route(async () => {
  const rows = await sql`
    SELECT v.*, s.slug, s.type, o.name AS org_name, ru.name AS reviewer_name
    FROM versions v
    JOIN skills s ON s.id = v.skill_id
    JOIN orgs o ON o.id = s.org_id
    LEFT JOIN users ru ON ru.id = v.reviewer_id
    WHERE v.status IN ('submitted','in_review') ORDER BY v.submitted_at`;
  return {
    queue: rows.map((r) => ({ ...versionView(r), slug: r.slug, type: r.type, orgName: r.org_name, reviewerName: r.reviewer_name })),
  };
}, { roles: GOVERNANCE_ROLES });
