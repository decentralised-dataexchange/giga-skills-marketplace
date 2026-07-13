import AdmZip from "adm-zip";
import { sql } from "@/lib/db";
import { check, route } from "@/lib/handler";
import { hasMarketplaceService, marketplaceRequest } from "@/lib/marketplace-client";
import type { BundleFile } from "@/lib/views";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Download a published skill/use-case bundle as a .zip. Public: published
// bundles are already publicly readable file-by-file on the detail page.
export const GET = route<{ slug: string }>(async ({ params }) => {
  const slug = params.slug;

  let files: BundleFile[] | undefined;
  if (hasMarketplaceService) {
    const detail = await marketplaceRequest<any>(`/v1/skills/${encodeURIComponent(slug)}`);
    files = detail?.version?.files;
  } else {
    const [skill] = await sql`
      SELECT published_version_id FROM skills WHERE slug = ${slug} AND status = 'published'`;
    check(skill?.published_version_id, 404, "Skill not found or not published");
    const [version] =
      await sql`SELECT files FROM versions WHERE id = ${skill.published_version_id}`;
    files = version?.files as BundleFile[] | undefined;
  }

  check(Array.isArray(files) && files.length > 0, 404, "No downloadable files for this skill");

  const zip = new AdmZip();
  for (const f of files!) {
    if (!f?.path || typeof f.content !== "string") continue;
    if (f.path.includes("..") || f.path.startsWith("/")) continue;
    zip.addFile(`${slug}/${f.path}`, Buffer.from(f.content, "utf8"));
  }
  const buffer = zip.toBuffer();

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${slug}.zip"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "no-store",
    },
  });
});
