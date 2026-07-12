import AdmZip from "adm-zip";
import { ApiError, check, route } from "@/lib/handler";
import type { BundleFile } from "@/lib/views";

export const MAX_BUNDLE_BYTES = 2 * 1024 * 1024;
const JUNK_RE = /(^|\/)(__MACOSX|\.DS_Store|Thumbs\.db|\.git)(\/|$)/;

export const POST = route(
  async ({ body }) => {
    const { zipBase64 } = await body<{ zipBase64?: string }>();
    check(zipBase64, 400, "zipBase64 is required");

    let zip: AdmZip;
    try {
      zip = new AdmZip(Buffer.from(zipBase64, "base64"));
    } catch (err) {
      throw new ApiError(
        400,
        `Could not read the zip file: ${err instanceof Error ? err.message : err}`,
      );
    }

    let files: BundleFile[] = [];
    let total = 0;
    for (const entry of zip.getEntries()) {
      if (entry.isDirectory) continue;
      const path = entry.entryName.replaceAll("\\", "/");
      if (JUNK_RE.test(path) || path.includes("..") || path.startsWith("/")) continue;
      const data = entry.getData();
      if (data.includes(0)) continue; // skip binary files; bundles are text artefacts
      total += data.length;
      check(total <= MAX_BUNDLE_BYTES, 400, "Bundle exceeds the 2 MB limit");
      files.push({ path, content: data.toString("utf8") });
    }
    check(files.length > 0, 400, "The zip contains no usable text files");

    // If everything sits inside one root folder (my-skill/SKILL.md), strip it.
    const roots = new Set(files.map((f) => f.path.split("/")[0]));
    if (roots.size === 1 && files.every((f) => f.path.includes("/"))) {
      const root = [...roots][0];
      files = files.map((f) => ({ ...f, path: f.path.slice(root.length + 1) }));
    }
    return { files };
  },
  { roles: ["provider"] },
);
