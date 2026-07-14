import AdmZip from "adm-zip";
import { ApiError, check, route } from "@/lib/handler";
import type { BundleFile } from "@/lib/views";

const MAX_BUNDLE_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_BYTES = 12 * 1024 * 1024;
const MAX_BUNDLES = 50;
const JUNK_RE = /(^|\/)(__MACOSX|\.DS_Store|Thumbs\.db|\.git)(\/|$)/;

interface Bundle {
  name: string;
  files: BundleFile[];
}

// Split a zip that contains multiple skill folders (each top-level folder with a
// SKILL.md is one skill) into separate bundles. A zip with a single skill at the
// root (SKILL.md at top level) yields one bundle.
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

    // Collect usable text files, grouped by their top-level folder.
    const groups = new Map<string, BundleFile[]>();
    let total = 0;
    for (const entry of zip.getEntries()) {
      if (entry.isDirectory) continue;
      const path = entry.entryName.replaceAll("\\", "/");
      if (JUNK_RE.test(path) || path.includes("..") || path.startsWith("/")) continue;
      const data = entry.getData();
      if (data.includes(0)) continue; // skip binary files; bundles are text artefacts
      total += data.length;
      check(total <= MAX_TOTAL_BYTES, 400, "Archive exceeds the 12 MB limit");

      const slash = path.indexOf("/");
      const folder = slash === -1 ? "" : path.slice(0, slash);
      const rel = slash === -1 ? path : path.slice(slash + 1);
      if (!rel) continue;
      const list = groups.get(folder) ?? [];
      list.push({ path: rel, content: data.toString("utf8") });
      groups.set(folder, list);
    }

    // A group is a skill only if it has a SKILL.md at its root.
    const bundles: Bundle[] = [];
    for (const [folder, files] of groups) {
      const hasManifest = files.some((f) => f.path.toLowerCase() === "skill.md");
      if (!hasManifest) continue;
      const bytes = files.reduce((n, f) => n + f.content.length, 0);
      check(bytes <= MAX_BUNDLE_BYTES, 400, `Skill "${folder || "root"}" exceeds the 2 MB limit`);
      bundles.push({ name: folder || "skill", files });
    }

    check(
      bundles.length > 0,
      400,
      "No skill folders found. Each skill must be a folder containing a SKILL.md.",
    );
    check(bundles.length <= MAX_BUNDLES, 400, `Too many skills (max ${MAX_BUNDLES} per archive)`);
    bundles.sort((a, b) => a.name.localeCompare(b.name));
    return { bundles };
  },
  { roles: ["provider"] },
);
