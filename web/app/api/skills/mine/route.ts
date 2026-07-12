import { sql } from "@/lib/db";
import { route } from "@/lib/handler";
import { skillView, versionView } from "@/lib/views";

export const GET = route(
  async ({ user }) => {
    const skills = await sql`
    SELECT s.* FROM skills s JOIN orgs o ON o.id = s.org_id WHERE o.owner_id = ${user!.id} ORDER BY s.id`;
    const out = [];
    for (const s of skills) {
      const versions = await sql`SELECT * FROM versions WHERE skill_id = ${s.id} ORDER BY id`;
      out.push({ ...skillView(s), versions: versions.map((v) => versionView(v)) });
    }
    return { skills: out };
  },
  { roles: ["provider"] },
);
