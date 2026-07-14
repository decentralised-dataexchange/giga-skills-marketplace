import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { route } from "@/lib/handler";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Agent Skills discovery index (Mintlify/Stripe format) for a single provider:
//   GET /<providerslug>/.well-known/skills/index.json
// so agents can run `npx skills add <host>/<providerslug>`.
export const GET = route<{ provider: string }>(async ({ params }) => {
  const [org] =
    await sql`SELECT id FROM orgs WHERE slug = ${params.provider} AND status = 'approved'`;
  if (!org) return NextResponse.json({ skills: [] }, { status: 404 });

  const rows = await sql`
    SELECT s.slug, v.manifest, v.files
    FROM skills s
    JOIN versions v ON v.id = s.published_version_id
    WHERE s.org_id = ${org.id} AND s.type = 'skill' AND s.status = 'published'
    ORDER BY s.slug`;

  const skills = rows.map((r: any) => ({
    name: r.slug,
    description: r.manifest?.description ?? "",
    // SKILL.md first (the entry point), then the rest.
    files: (r.files ?? [])
      .map((f: any) => f.path)
      .sort((a: string, b: string) =>
        a.toLowerCase() === "skill.md" ? -1 : b.toLowerCase() === "skill.md" ? 1 : 0,
      ),
  }));

  return NextResponse.json(
    { skills },
    {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
      },
    },
  );
});
