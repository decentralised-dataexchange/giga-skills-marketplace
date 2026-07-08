import { sql } from "@/lib/db";
import { route } from "@/lib/handler";
import { publicUser } from "@/lib/views";

export const GET = route(async () => {
  const rows = await sql`SELECT * FROM users ORDER BY id`;
  return { users: rows.map(publicUser) };
}, { roles: ["superadmin"] });
