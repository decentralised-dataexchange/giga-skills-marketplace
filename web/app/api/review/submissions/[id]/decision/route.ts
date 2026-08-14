// Decide a source submission as a whole: one decision covers every skill in
// it, in one transaction. Approval publishes every version (and relists a
// delisted source); rejection and change requests park them together.
import { sql, logEvent } from "@/lib/db";
import { GOVERNANCE_ROLES } from "@/lib/auth";
import { check, route } from "@/lib/handler";
import { isUuid } from "@/lib/utils";
import { skillView, submissionView } from "@/lib/views";

const VERSION_STATUS = {
  approve: "published",
  reject: "rejected",
  request_changes: "changes_requested",
} as const;

const SUBMISSION_STATUS = {
  approve: "approved",
  reject: "rejected",
  request_changes: "changes_requested",
} as const;

export const POST = route<{ id: string }>(
  async ({ user, params, body }) => {
    const { decision, notes } = await body<{
      decision: keyof typeof VERSION_STATUS;
      notes?: string;
    }>();
    check(decision in VERSION_STATUS, 400, "decision must be approve, reject or request_changes");
    check(isUuid(params.id), 404, "Submission not found");
    const [current] = await sql`SELECT * FROM submissions WHERE id = ${params.id}`;
    check(current, 404, "Submission not found");
    check(
      ["submitted", "in_review"].includes(current.status),
      409,
      `Submission is ${current.status}`,
    );
    // A reviewer decides only submissions they have claimed; a super admin may
    // decide any submission directly.
    check(
      user!.role === "superadmin" ||
        (current.status === "in_review" && current.reviewer_id === user!.id),
      403,
      current.status === "submitted"
        ? "Claim the submission before deciding it"
        : "This review is claimed by another reviewer",
    );

    const reviewNotes = notes?.trim() || null;
    const { submission, skills } = await sql.begin(async (tx) => {
      const db = tx as unknown as typeof sql;
      const [sub] = await tx`
      UPDATE submissions SET status = ${SUBMISSION_STATUS[decision]}, reviewer_id = ${user!.id},
                             review_notes = ${reviewNotes}, decided_at = now()
      WHERE id = ${current.id} RETURNING *`;

      const versions = await tx`
      SELECT v.id, v.skill_id, sk.slug, sk.published_version_id
      FROM versions v JOIN skills sk ON sk.id = v.skill_id
      WHERE v.submission_id = ${current.id}`;

      for (const v of versions) {
        await tx`
        UPDATE versions SET status = ${VERSION_STATUS[decision]}, reviewer_id = ${user!.id},
                            review_notes = ${reviewNotes}, decided_at = now()
        WHERE id = ${v.id}`;
        if (decision === "approve") {
          if (v.published_version_id && v.published_version_id !== v.id) {
            await tx`UPDATE versions SET status = 'superseded' WHERE id = ${v.published_version_id}`;
          }
          await tx`
          UPDATE skills SET status = 'published', published_version_id = ${v.id}
          WHERE id = ${v.skill_id}`;
        } else if (!v.published_version_id) {
          await tx`UPDATE skills SET status = ${VERSION_STATUS[decision]} WHERE id = ${v.skill_id}`;
        }
        await logEvent(
          `review.${decision}`,
          user!.id,
          { skillId: v.skill_id, versionId: v.id, submissionId: current.id },
          { slug: v.slug, notes: reviewNotes },
          db,
        );
      }

      if (decision === "approve") {
        // Approval is also the road back for a delisted source, and it
        // retires any earlier approved submission of the same source.
        await tx`UPDATE sources SET status = 'active' WHERE id = ${sub.source_id}`;
        await tx`
        UPDATE submissions SET status = 'superseded'
        WHERE source_id = ${sub.source_id} AND status = 'approved' AND id <> ${sub.id}`;
      }

      const updated = await tx`
      SELECT * FROM skills
      WHERE id IN (SELECT skill_id FROM versions WHERE submission_id = ${current.id})
      ORDER BY slug`;
      return { submission: sub, skills: updated };
    });

    return { submission: submissionView(submission), skills: skills.map(skillView) };
  },
  { roles: GOVERNANCE_ROLES },
);
