// Automated pre-review validation of a skill bundle (the "binary validation"
// step of the app-store style pipeline).
import { parse as parseYaml } from "yaml";
import type { BundleFile } from "./views";

const SLUG_RE = /^[a-z0-9][a-z0-9-]{2,63}$/;
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/;

export interface Check {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
}

export type Manifest = Record<string, unknown> & {
  name?: string;
  version?: string;
  title?: string;
  provider?: string;
  license?: string;
  metadata?: Record<string, string>;
  depends_on?: { schemas?: string[]; rulebooks?: string[] };
  targets?: { openapi?: string; protocols?: string[] };
};

function parseManifest(files: BundleFile[]): { manifest?: Manifest; body: string; error?: string } {
  const skillMd = files.find((f) => f.path.toLowerCase() === "skill.md");
  if (!skillMd) return { body: "", error: "SKILL.md not found at bundle root" };
  const match = skillMd.content.match(FRONTMATTER_RE);
  if (!match) return { body: "", error: "SKILL.md has no YAML frontmatter block (--- ... ---)" };
  try {
    const manifest = parseYaml(match[1]);
    if (typeof manifest !== "object" || manifest === null) {
      return { body: "", error: "Frontmatter is not a YAML mapping" };
    }
    return { manifest, body: skillMd.content.slice(match[0].length).trim() };
  } catch (err) {
    return { body: "", error: `Frontmatter YAML parse error: ${err}` };
  }
}

export function runChecks(files: BundleFile[]): {
  checks: Check[];
  passed: boolean;
  manifest?: Manifest;
} {
  const checks: Check[] = [];
  const add = (
    id: string,
    label: string,
    ok: boolean,
    detail = "",
    level: "fail" | "warn" = "fail",
  ) => checks.push({ id, label, status: ok ? "pass" : level, detail });

  const { manifest, body, error } = parseManifest(files);
  if (error || !manifest) {
    add("manifest", "SKILL.md manifest present and parseable", false, error);
    return { checks, passed: false };
  }
  add("manifest", "SKILL.md manifest present and parseable", true, `name: ${manifest.name ?? "?"}`);

  for (const field of ["name", "description", "license"]) {
    const value = manifest[field];
    add(
      `field-${field}`,
      `Manifest declares "${field}"`,
      !!value,
      value ? String(value).slice(0, 120) : "missing",
    );
  }
  // provider may live at the top level (legacy) or under spec-conformant metadata.
  const provider = manifest.provider ?? manifest.metadata?.provider;
  add(
    "field-provider",
    "Manifest declares a provider (metadata.provider)",
    !!provider,
    provider ? String(provider).slice(0, 120) : "missing",
  );
  if (manifest.name)
    add(
      "slug",
      "Skill name is a valid slug (lowercase, hyphenated)",
      SLUG_RE.test(String(manifest.name)),
      String(manifest.name),
    );
  add(
    "body",
    "SKILL.md contains instructions beyond the manifest",
    body.length >= 80,
    `${body.length} characters of instructions`,
  );

  // OpenAPI specs: at least one, each must parse and declare openapi 3.x
  const apiFiles = files.filter(
    (f) => /^openapi\//i.test(f.path) && /\.(ya?ml|json)$/i.test(f.path),
  );
  add(
    "openapi-present",
    "Bundle contains at least one OpenAPI spec under openapi/",
    apiFiles.length > 0,
    apiFiles.map((f) => f.path).join(", ") || "none found - recommended for API skills",
    "warn",
  );
  for (const f of apiFiles) {
    let ok = false;
    let detail = "";
    try {
      const doc = parseYaml(f.content);
      ok = typeof doc?.openapi === "string" && doc.openapi.startsWith("3.");
      detail = ok
        ? `OpenAPI ${doc.openapi}, ${Object.keys(doc.paths ?? {}).length} paths`
        : 'missing or non-3.x "openapi" field';
    } catch (err) {
      detail = `parse error: ${err}`;
    }
    add(`openapi:${f.path}`, `${f.path} is a valid OpenAPI 3.x document`, ok, detail);
  }

  // JSON schemas
  const schemaFiles = files.filter(
    (f) => /^schemas\//i.test(f.path) && f.path.toLowerCase().endsWith(".json"),
  );
  for (const f of schemaFiles) {
    let ok = false;
    let detail = "";
    try {
      const doc = JSON.parse(f.content);
      ok = typeof doc === "object" && doc !== null;
      detail = ok && doc.title ? `title: ${doc.title}` : "parsed";
    } catch (err) {
      detail = `parse error: ${err}`;
    }
    add(`schema:${f.path}`, `${f.path} is valid JSON`, ok, detail);
  }
  add(
    "schemas-present",
    "Bundle contains credential/record schemas under schemas/",
    schemaFiles.length > 0,
    schemaFiles.length
      ? `${schemaFiles.length} schema(s)`
      : "none found - recommended by the marketplace guidelines",
    "warn",
  );

  // Rulebooks
  const rulebooks = files.filter((f) => /^rulebooks\//i.test(f.path));
  add(
    "rulebooks-present",
    "Bundle contains rulebooks under rulebooks/",
    rulebooks.length > 0,
    rulebooks.map((f) => f.path).join(", ") ||
      "none found - policy rules should be separable from code",
    "warn",
  );

  // depends_on paths must resolve inside the bundle
  const deps = [
    ...(manifest.depends_on?.schemas ?? []),
    ...(manifest.depends_on?.rulebooks ?? []),
    ...(manifest.targets?.openapi ? [manifest.targets.openapi] : []),
  ];
  const paths = new Set(files.map((f) => f.path));
  for (const dep of deps.map(String)) {
    const clean = dep.replace(/^\.\//, "");
    add(
      `dep:${clean}`,
      `Declared dependency exists in bundle: ${clean}`,
      paths.has(clean),
      paths.has(clean) ? "resolved" : "referenced in manifest but not included",
    );
  }

  return { checks, passed: checks.every((c) => c.status !== "fail"), manifest };
}
