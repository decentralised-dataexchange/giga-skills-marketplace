import { sql } from "@/lib/db";
import { check, route } from "@/lib/handler";

// Serve a generated app at a stable, shareable URL (full-screen view).
export const GET = route<{ shareId: string }>(async ({ params }) => {
  const [row] = await sql`SELECT app_html FROM chats WHERE share_id = ${params.shareId}`;
  check(row?.app_html, 404, "App not found");
  return new Response(row.app_html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
});
