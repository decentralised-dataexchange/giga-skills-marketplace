import { sql } from "@/lib/db";
import { check, route } from "@/lib/handler";
import type { BundleFile } from "@/lib/views";

/* eslint-disable @typescript-eslint/no-explicit-any */

const CONTENT_TYPES: Record<string, string> = {
  md: "text/markdown; charset=utf-8",
  json: "application/json; charset=utf-8",
  yaml: "text/yaml; charset=utf-8",
  yml: "text/yaml; charset=utf-8",
  http: "text/plain; charset=utf-8",
};

// Serves an individual published skill file referenced from the discovery index:
//   GET /<providerslug>/.well-known/skills/<skillslug>/<path...>
export const GET = route<{ provider: string; skill: string; file: string[] }>(
  async ({ params }) => {
    const filePath = params.file.join("/");
    const [row] = await sql`
    SELECT v.files
    FROM skills s
    JOIN orgs o ON o.id = s.org_id
    JOIN versions v ON v.id = s.published_version_id
    WHERE o.slug = ${params.provider} AND o.status = 'approved'
      AND s.slug = ${params.skill} AND s.type = 'skill' AND s.status = 'published'`;
    check(row, 404, "Not found");
    const files = (row.files ?? []) as BundleFile[];
    const file = files.find((f: any) => f.path === filePath);
    check(file, 404, "File not found");

    const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
    return new Response(file!.content, {
      headers: {
        "Content-Type": CONTENT_TYPES[ext] ?? "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  },
);
