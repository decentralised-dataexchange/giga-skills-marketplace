import { sql } from "@/lib/db";
import { route } from "@/lib/handler";
import { orgView } from "@/lib/views";

export const GET = route(async ({ user }) => {
  const rows = await sql`SELECT * FROM orgs WHERE owner_id = ${user!.id} ORDER BY id`;
  return { orgs: rows.map(orgView) };
}, { roles: ["provider"] });
