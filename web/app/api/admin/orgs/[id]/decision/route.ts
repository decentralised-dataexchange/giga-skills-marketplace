import { sql, logEvent } from "@/lib/db";
import { check, route } from "@/lib/handler";
import { isUuid } from "@/lib/utils";
import { orgView } from "@/lib/views";

export const POST = route<{ id: string }>(
  async ({ user, params, body }) => {
    const { decision, notes } = await body<{ decision: string; notes?: string }>();
    check(["approve", "reject"].includes(decision), 400, "decision must be approve or reject");
    check(isUuid(params.id), 404, "Organisation not found");
    const [current] = await sql`SELECT * FROM orgs WHERE id = ${params.id}`;
    check(current, 404, "Organisation not found");
    check(current.status === "pending", 409, `Organisation is already ${current.status}`);
    const status = decision === "approve" ? "approved" : "rejected";
    const [org] = await sql`
    UPDATE orgs SET status = ${status}, decided_at = now(), decided_by = ${user!.id},
                    decision_notes = ${notes?.trim() || null}
    WHERE id = ${params.id} RETURNING *`;
    await logEvent(`org.${status}`, user!.id, { orgId: org.id }, { notes: org.decision_notes });
    return { org: orgView(org) };
  },
  { roles: ["superadmin"] },
);
