import { sql } from "@/lib/db";
import { route } from "@/lib/handler";
import { orgView } from "@/lib/views";

export const GET = route(async () => {
  const rows = await sql`
    SELECT o.*, u.email AS owner_email, u.name AS owner_name, u.role AS owner_role
    FROM orgs o JOIN users u ON u.id = o.owner_id ORDER BY o.id`;
  return {
    orgs: rows.map((r) => ({
      ...orgView(r),
      owner: { email: r.owner_email, name: r.owner_name, role: r.owner_role },
    })),
  };
}, { roles: ["superadmin"] });
