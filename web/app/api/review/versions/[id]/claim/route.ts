import { sql, logEvent } from "@/lib/db";
import { GOVERNANCE_ROLES } from "@/lib/auth";
import { check, route } from "@/lib/handler";
import { isUuid } from "@/lib/utils";
import { versionView } from "@/lib/views";

export const POST = route<{ id: string }>(
  async ({ user, params }) => {
    check(isUuid(params.id), 404, "Version not found");
    const [version] = await sql`
    UPDATE versions SET status = 'in_review', reviewer_id = ${user!.id}
    WHERE id = ${params.id} AND status = 'submitted' RETURNING *`;
    check(version, 409, "Version not found or not claimable");
    await logEvent("review.claimed", user!.id, { versionId: version.id }, null);
    return { version: versionView(version) };
  },
  { roles: GOVERNANCE_ROLES },
);
