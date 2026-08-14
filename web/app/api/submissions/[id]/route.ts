// One source submission with everything a review needs: the source, the
// organisation, and every skill's snapshot (manifest, checks, files) exactly
// as it was pinned at submission time.
import { sql } from "@/lib/db";
import { GOVERNANCE_ROLES } from "@/lib/auth";
import { check, route } from "@/lib/handler";
import { isUuid } from "@/lib/utils";
import { sourceView, submissionView, versionView } from "@/lib/views";

export const GET = route<{ id: string }>(
  async ({ user, params }) => {
    check(isUuid(params.id), 404, "Submission not found");
    const [row] = await sql`
    SELECT sub.*, o.id AS org_id, o.owner_id, o.name AS org_name, o.description AS org_description,
           o.website AS org_website, o.status AS org_status,
           src.url AS source_url, src.owner AS source_owner, src.repo AS source_repo,
           src.status AS source_status, src.created_at AS source_created_at
    FROM submissions sub
    JOIN sources src ON src.id = sub.source_id
    JOIN orgs o ON o.id = src.org_id
    WHERE sub.id = ${params.id}`;
    check(row, 404, "Submission not found");
    const allowed = row.owner_id === user!.id || GOVERNANCE_ROLES.includes(user!.role);
    check(allowed, 403, "Not visible to you");

    const versions = await sql`
    SELECT v.*, sk.slug, sk.status AS skill_status, sk.org_id AS skill_org_id
    FROM versions v JOIN skills sk ON sk.id = v.skill_id
    WHERE v.submission_id = ${params.id} ORDER BY sk.slug`;

    return {
      submission: submissionView(row),
      source: sourceView({
        id: row.source_id,
        org_id: row.org_id,
        url: row.source_url,
        owner: row.source_owner,
        repo: row.source_repo,
        status: row.source_status,
        created_at: row.source_created_at,
      }),
      org: {
        id: row.org_id,
        name: row.org_name,
        description: row.org_description,
        website: row.org_website,
        status: row.org_status,
      },
      skills: versions.map((v) => ({
        skill: { id: v.skill_id, slug: v.slug, orgId: v.skill_org_id, status: v.skill_status },
        version: versionView(v, true),
      })),
    };
  },
  { auth: true },
);
