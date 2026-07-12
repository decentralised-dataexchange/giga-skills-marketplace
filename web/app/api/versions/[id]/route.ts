import { sql } from "@/lib/db";
import { GOVERNANCE_ROLES } from "@/lib/auth";
import { check, route } from "@/lib/handler";
import { versionView } from "@/lib/views";

export const GET = route<{ id: string }>(async ({ user, params }) => {
  const [row] = await sql`
    SELECT v.*, s.slug, s.org_id, s.official, o.owner_id, o.name AS org_name, o.description AS org_description,
           o.website AS org_website, o.status AS org_status
    FROM versions v JOIN skills s ON s.id = v.skill_id JOIN orgs o ON o.id = s.org_id
    WHERE v.id = ${params.id}`;
  check(row, 404, "Version not found");
  const allowed = row.owner_id === user!.id || GOVERNANCE_ROLES.includes(user!.role) || row.status === "published";
  check(allowed, 403, "Not visible to you");
  return {
    version: versionView(row, true),
    skill: { id: row.skill_id, slug: row.slug, orgId: row.org_id, official: row.official ?? false },
    org: { id: row.org_id, name: row.org_name, description: row.org_description,
           website: row.org_website, status: row.org_status },
  };
}, { auth: true });
