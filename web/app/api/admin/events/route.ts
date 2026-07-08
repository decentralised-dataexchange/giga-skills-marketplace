import { sql } from "@/lib/db";
import { GOVERNANCE_ROLES } from "@/lib/auth";
import { route } from "@/lib/handler";

export const GET = route(async () => {
  const rows = await sql`
    SELECT e.*, u.name AS actor_name, u.email AS actor_email
    FROM events e LEFT JOIN users u ON u.id = e.actor_id ORDER BY e.id DESC LIMIT 200`;
  return {
    events: rows.map((r) => ({
      id: r.id, type: r.type, subject: r.subject, detail: r.detail, at: r.at,
      actor: { name: r.actor_name ?? "system", email: r.actor_email ?? "-" },
    })),
  };
}, { roles: GOVERNANCE_ROLES });
