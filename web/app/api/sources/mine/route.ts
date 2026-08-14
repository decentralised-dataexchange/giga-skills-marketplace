// The provider's sources with their skills (each with full version history)
// and their submissions. This is the server-side truth the Skill Sources page
// renders; the client no longer reconstructs sources from version blobs.
import { sql } from "@/lib/db";
import { route } from "@/lib/handler";
import { skillView, sourceView, submissionView, versionView } from "@/lib/views";

export const GET = route(
  async ({ user }) => {
    const sources = await sql`
    SELECT src.* FROM sources src JOIN orgs o ON o.id = src.org_id
    WHERE o.owner_id = ${user!.id} ORDER BY src.created_at`;
    const out = [];
    for (const src of sources) {
      const skills = await sql`
      SELECT * FROM skills WHERE source_id = ${src.id} ORDER BY created_at`;
      const withVersions = [];
      for (const s of skills) {
        const versions =
          await sql`SELECT * FROM versions WHERE skill_id = ${s.id} ORDER BY submitted_at`;
        withVersions.push({ ...skillView(s), versions: versions.map((v) => versionView(v)) });
      }
      const submissions = await sql`
      SELECT * FROM submissions WHERE source_id = ${src.id} ORDER BY submitted_at`;
      out.push({
        ...sourceView(src),
        skills: withVersions,
        submissions: submissions.map(submissionView),
      });
    }
    return { sources: out };
  },
  { roles: ["provider"] },
);
