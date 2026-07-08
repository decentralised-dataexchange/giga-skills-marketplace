import { sql } from "@/lib/db";
import { check, route } from "@/lib/handler";

export const POST = route<{ slug: string }>(async ({ params }) => {
  const [row] = await sql`
    UPDATE skills SET installs = installs + 1
    WHERE slug = ${params.slug} AND status = 'published' RETURNING installs`;
  check(row, 404, "Skill not found");
  return { installs: row.installs };
});
