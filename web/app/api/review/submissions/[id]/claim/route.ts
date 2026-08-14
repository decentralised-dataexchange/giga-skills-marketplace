import { sql, logEvent } from "@/lib/db";
import { GOVERNANCE_ROLES } from "@/lib/auth";
import { check, route } from "@/lib/handler";
import { isUuid } from "@/lib/utils";
import { submissionView } from "@/lib/views";

export const POST = route<{ id: string }>(
  async ({ user, params }) => {
    check(isUuid(params.id), 404, "Submission not found");
    // Atomic claim: only one reviewer wins a submitted submission.
    const [submission] = await sql`
    UPDATE submissions SET status = 'in_review', reviewer_id = ${user!.id}
    WHERE id = ${params.id} AND status = 'submitted' RETURNING *`;
    check(submission, 409, "Submission not found or not claimable");
    await logEvent(
      "review.claimed",
      user!.id,
      { submissionId: submission.id, sourceId: submission.source_id },
      null,
    );
    return { submission: submissionView(submission) };
  },
  { roles: GOVERNANCE_ROLES },
);
