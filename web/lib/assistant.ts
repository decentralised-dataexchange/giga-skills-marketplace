// Skill-context composition for the Integration Assistant.
import { sql } from "./db";
import { fetchSkillContext, hasMarketplaceService, type SkillContextRecord } from "./marketplace-client";

export { DEFAULT_MODEL, MODELS } from "./models";
import type { BundleFile } from "./views";

const MAX_FILE_CHARS = 12_000;
const MAX_SKILL_CHARS = 40_000;


export async function renderSkillContext(slugs: string[]): Promise<string> {
  if (!slugs.length) return "";
  const rows: SkillContextRecord[] = hasMarketplaceService
    ? (await fetchSkillContext(slugs)).skills
    : (await sql`
        SELECT s.slug, v.version, v.files, o.name AS org_name
        FROM skills s
        JOIN versions v ON v.id = s.published_version_id
        JOIN orgs o ON o.id = s.org_id
        WHERE s.status = 'published' AND s.slug = ANY(${slugs})`)
      .map((row) => ({ slug: row.slug, version: row.version, files: row.files as BundleFile[], orgName: row.org_name }));
  return rows
    .map((row) => {
      let block = `\n\n=== INVOKED SKILL: ${row.slug} v${row.version} (provider: ${row.orgName}) ===\n`;
      // SKILL.md first, it is the entry point, then supporting artefacts.
      const ordered = [...(row.files as BundleFile[])].sort((a, b) =>
        Number(a.path.toLowerCase() !== "skill.md") - Number(b.path.toLowerCase() !== "skill.md"));
      for (const f of ordered) {
        const content = f.content.length > MAX_FILE_CHARS
          ? `${f.content.slice(0, MAX_FILE_CHARS)}\n... [truncated]`
          : f.content;
        const addition = `\n--- ${f.path} ---\n${content}\n`;
        block += block.length + addition.length > MAX_SKILL_CHARS
          ? `\n--- ${f.path} --- [omitted for length]\n`
          : addition;
      }
      return block;
    })
    .join("\n");
}

export function buildInstructions(skillContext: string, slugs: string[]): string {
  const invoked = slugs.join(", ") || "(none - advise the user to invoke at least one skill with /skill-name)";
  return `You are the GovBuild Integration Assistant. You help students, implementers and anyone else build small, self-contained HTML applications on top of Digital Public Infrastructure (DPI) wallet building blocks, using provider-published skill files invoked from the skills marketplace.

RULES:
1. Always produce a COMPLETE, SINGLE-FILE HTML application (inline <style> and <script>, no build step, no external CDNs) inside exactly one \`\`\`html fenced code block. Everything outside that block is your explanation, kept brief.
2. Follow the invoked skill files below exactly: use their OpenAPI endpoints, request/response shapes, credential schemas, protocol ordering (e.g. OpenID4VCI issuance, OpenID4VP presentation) and rulebook constraints. Do not invent endpoints that are not in the specs.
3. The app must include a "Mock mode" toggle (default ON) that simulates API responses locally using realistic sample data derived from the skill's schemas and examples, so the app is demonstrable without a live sandbox. When mock mode is off, the app calls the real base URL and API key that the user enters in a small settings panel.
4. Respect the governance model: show consent prompts before sharing data, display verification results (authenticity, integrity, issuer signature, revocation status), and log user-visible audit events where the rulebooks require it.
5. Make the UI clean and accessible: readable typography, keyboard-friendly forms, clear status feedback.
6. When the user asks for changes, return the FULL updated HTML file again in one \`\`\`html block - never a partial diff.

Invoked skills: ${invoked}
${skillContext}`;
}
