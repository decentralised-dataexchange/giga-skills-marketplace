import { sql, logEvent } from "@/lib/db";
import { GOVERNANCE_ROLES } from "@/lib/auth";
import { check, route } from "@/lib/handler";
import { isUuid } from "@/lib/utils";
import { applicationView } from "@/lib/views";

// Moderation: a reviewer or super admin can delist (or restore) an application.
export const POST = route<{ id: string }>(
  async ({ user, params, body }) => {
    const { status } = await body<{ status?: string }>();
    check(
      status === "published" || status === "delisted",
      400,
      "status must be published or delisted",
    );
    check(isUuid(params.id), 404, "Application not found");
    const [app] = await sql`SELECT * FROM applications WHERE id = ${params.id}`;
    check(app, 404, "Application not found");
    const [updated] = await sql`
    UPDATE applications SET status = ${status} WHERE id = ${app.id} RETURNING *`;
    await logEvent(
      "application.moderated",
      user!.id,
      { applicationId: app.id },
      { title: app.title, status },
    );
    return { application: applicationView(updated) };
  },
  { roles: GOVERNANCE_ROLES },
);
