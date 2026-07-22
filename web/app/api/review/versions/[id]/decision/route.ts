import { sql, logEvent } from "@/lib/db";
import { GOVERNANCE_ROLES } from "@/lib/auth";
import { check, route } from "@/lib/handler";
import { isUuid } from "@/lib/utils";
import { skillView, versionView } from "@/lib/views";

const STATUS = {
  approve: "published",
  reject: "rejected",
  request_changes: "changes_requested",
} as const;

export const POST = route<{ id: string }>(
  async ({ user, params, body }) => {
    const { decision, notes, official } = await body<{
      decision: keyof typeof STATUS;
      notes?: string;
      official?: boolean;
    }>();
    check(decision in STATUS, 400, "decision must be approve, reject or request_changes");
    check(isUuid(params.id), 404, "Version not found");
    const [current] = await sql`SELECT * FROM versions WHERE id = ${params.id}`;
    check(current, 404, "Version not found");
    check(["submitted", "in_review"].includes(current.status), 409, `Version is ${current.status}`);
    // A reviewer may only decide reviews they claimed; super admin can decide any.
    check(
      user!.role === "superadmin" ||
        current.status !== "in_review" ||
        current.reviewer_id === user!.id,
      403,
      "This review is claimed by another reviewer",
    );

    const [skill] = await sql`SELECT * FROM skills WHERE id = ${current.skill_id}`;
    const [version] = await sql`
    UPDATE versions SET status = ${STATUS[decision]}, reviewer_id = ${user!.id},
                        review_notes = ${notes?.trim() || null}, decided_at = now()
    WHERE id = ${current.id} RETURNING *`;

    if (decision === "approve") {
      if (skill.published_version_id) {
        await sql`UPDATE versions SET status = 'superseded' WHERE id = ${skill.published_version_id}`;
      }
      await sql`
      UPDATE skills SET status = 'published', published_version_id = ${current.id}, official = ${!!official}
      WHERE id = ${skill.id}`;
    } else if (!skill.published_version_id) {
      await sql`UPDATE skills SET status = ${STATUS[decision]} WHERE id = ${skill.id}`;
    }
    await logEvent(
      `review.${decision}`,
      user!.id,
      { skillId: skill.id, versionId: current.id },
      {
        slug: skill.slug,
        notes: version.review_notes,
        ...(decision === "approve" ? { official: !!official } : {}),
      },
    );
    const [updated] = await sql`SELECT * FROM skills WHERE id = ${skill.id}`;
    return { version: versionView(version), skill: skillView(updated) };
  },
  { roles: GOVERNANCE_ROLES },
);
