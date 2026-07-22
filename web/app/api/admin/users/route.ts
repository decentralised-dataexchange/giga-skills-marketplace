import { sql } from "@/lib/db";
import { route } from "@/lib/handler";
import { publicUser } from "@/lib/views";

export const GET = route(
  async ({ req }) => {
    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize")) || 12));
    const rows = await sql`
      SELECT * FROM users ORDER BY created_at
      LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`;
    const [{ n: total }] = await sql`SELECT count(*)::int AS n FROM users`;
    return { users: rows.map(publicUser), total, page, pageSize };
  },
  { roles: ["superadmin"] },
);
