import { sql } from "@/lib/db";
import { route } from "@/lib/handler";
import { applicationView } from "@/lib/views";

export const GET = route(async ({ user }) => {
  const rows = await sql`
    SELECT a.*, u.name AS developer_name
    FROM applications a JOIN users u ON u.id = a.developer_id
    WHERE a.developer_id = ${user!.id} ORDER BY a.id DESC`;
  return { applications: rows.map(applicationView) };
}, { auth: true });
