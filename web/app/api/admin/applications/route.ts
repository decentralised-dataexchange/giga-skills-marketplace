import { sql, logEvent } from "@/lib/db";
import { GOVERNANCE_ROLES } from "@/lib/auth";
import { route } from "@/lib/handler";
import { applicationView } from "@/lib/views";

export const GET = route(
  async () => {
    const rows = await sql`
    SELECT a.*, u.name AS developer_name, u.email AS developer_email
    FROM applications a JOIN users u ON u.id = a.developer_id ORDER BY a.created_at DESC`;
    return {
      applications: rows.map((r) => ({ ...applicationView(r), developerEmail: r.developer_email })),
    };
  },
  { roles: GOVERNANCE_ROLES },
);

// Superadmin: remove every showcase application.
export const DELETE = route(
  async ({ user }) => {
    const rows = await sql`DELETE FROM applications RETURNING id`;
    await logEvent("applications.purged", user!.id, null, { count: rows.length });
    return { deleted: rows.length };
  },
  { roles: ["superadmin"] },
);
