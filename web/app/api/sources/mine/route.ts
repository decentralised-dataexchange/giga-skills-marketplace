// The provider's sources with their skills (each with full version history)
// and their submissions. This is the server-side truth the Skill Sources page
// renders; the client no longer reconstructs sources from version blobs.
import { sql } from "@/lib/db";
import { route } from "@/lib/handler";
import { skillView, sourceView, submissionView, versionView } from "@/lib/views";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Where the source stands right now, for the dashboard. The stored
// sources.status only says active/archived; a source whose newest submission
// waits for review reads as that instead - so resubmitting an archived (or
// new) source immediately shows "Submitted", not a stale record state.
function effectiveStatus(source: any, skills: any[], submissions: any[]): string {
  const latest = submissions.at(-1);
  if (latest && ["submitted", "in_review"].includes(latest.status)) return latest.status;
  if (source.status === "archived") return "archived";
  if (skills.some((s) => s.status === "published")) return "active";
  // Nothing published and nothing pending: the last decision is the state.
  if (latest && ["changes_requested", "rejected"].includes(latest.status)) return latest.status;
  return "active";
}

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
      const subs = submissions.map(submissionView);
      out.push({
        ...sourceView(src),
        effectiveStatus: effectiveStatus(src, skills, subs),
        skills: withVersions,
        submissions: subs,
      });
    }
    return { sources: out };
  },
  { roles: ["provider"] },
);
