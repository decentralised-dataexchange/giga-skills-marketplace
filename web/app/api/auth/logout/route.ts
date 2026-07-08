import { sql } from "@/lib/db";
import { route } from "@/lib/handler";

export const POST = route(async ({ req }) => {
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  await sql`DELETE FROM tokens WHERE token = ${token}`;
  return { ok: true };
}, { auth: true });
