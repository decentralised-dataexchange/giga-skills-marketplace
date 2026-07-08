import { sql } from "@/lib/db";
import { route } from "@/lib/handler";
import { marketplaceEntry } from "@/lib/views";

export const GET = route(async ({ req }) => {
  const q = new URL(req.url).searchParams.get("q")?.toLowerCase().trim() ?? "";
  const rows = await sql`
    SELECT s.id, s.slug, s.status, s.installs,
           o.id AS org_id, o.name AS org_name, o.website AS org_website,
           v.version, v.manifest, v.decided_at
    FROM skills s
    JOIN orgs o ON o.id = s.org_id
    JOIN versions v ON v.id = s.published_version_id
    WHERE s.status = 'published' ORDER BY s.slug`;
  let entries = rows.map(marketplaceEntry);
  if (q) {
    entries = entries.filter((e) =>
      [e.slug, e.description, e.org.name, e.protocols.join(" ")].join(" ").toLowerCase().includes(q));
  }
  return { skills: entries };
});
