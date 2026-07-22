import { stringify as yamlStringify } from "yaml";
import { sql, logEvent, json } from "@/lib/db";
import { runChecks } from "@/lib/checks";
import { check, route } from "@/lib/handler";
import { isUuid } from "@/lib/utils";
import { skillView, versionView } from "@/lib/views";

interface Step {
  prompt?: string;
  skills?: string[];
}
interface Journey {
  tag?: string;
  title?: string;
  description?: string;
  prompts?: Step[];
  done?: string;
}
interface Form {
  orgId: string;
  name: string;
  title: string;
  description?: string;
  license?: string;
  prerequisites?: string[];
  journeys?: Journey[];
}

// Use cases are authored through the Provider Console form. We assemble a SKILL.md
// manifest from the structured fields and run it through the same review pipeline
// as any other submission.
export const POST = route(
  async ({ user, body }) => {
    const f = await body<Form>();
    check(f.name?.trim() && f.title?.trim(), 400, "Name and title are required");

    check(isUuid(f.orgId), 404, "Organisation not found");
    const [org] = await sql`SELECT * FROM orgs WHERE id = ${f.orgId} AND owner_id = ${user!.id}`;
    check(org, 404, "Organisation not found");
    check(org.status === "approved", 403, "Your organisation must be approved before publishing");

    const journeys = (f.journeys ?? []).map((j, i) => ({
      tag: j.tag?.trim() || `J${i + 1}`,
      title: (j.title ?? "").trim(),
      description: (j.description ?? "").trim(),
      prompts: (j.prompts ?? [])
        .map((p) => ({ prompt: (p.prompt ?? "").trim(), skills: (p.skills ?? []).filter(Boolean) }))
        .filter((p) => p.prompt),
      done: (j.done ?? "").trim(),
    }));
    const usesSkills = [...new Set(journeys.flatMap((j) => j.prompts.flatMap((p) => p.skills)))];

    const manifest: Record<string, unknown> = {
      type: "usecase",
      name: f.name.trim(),
      title: f.title.trim(),
      description: (f.description ?? "").trim(),
      provider: org.name,
      license: f.license?.trim() || "Apache-2.0",
      uses_skills: usesSkills,
      prerequisites: (f.prerequisites ?? []).map((p) => p.trim()).filter(Boolean),
      journeys,
    };

    const content = `---\n${yamlStringify(manifest)}---\n\n# ${manifest.title}\n\n${manifest.description}\n\n## How to run\n1. Install the referenced skills.\n2. Run the journeys in order; later journeys consume earlier outputs.\n`;
    const files = [{ path: "SKILL.md", content }];
    const { checks, passed, manifest: parsed } = runChecks(files);
    check(parsed?.name, 400, "Could not build a valid use-case manifest");

    const slug = String(parsed.name);
    let [skill] = await sql`SELECT * FROM skills WHERE slug = ${slug}`;
    check(
      !skill || skill.org_id === org.id,
      409,
      `Name "${slug}" is owned by another organisation`,
    );
    if (!skill)
      [skill] =
        await sql`INSERT INTO skills (slug, org_id, type) VALUES (${slug}, ${org.id}, 'usecase') RETURNING *`;

    const status = passed ? "submitted" : "checks_failed";
    const [version] = await sql`
    INSERT INTO versions (skill_id, version, manifest, files, checks, status, submitted_by)
    VALUES (${skill.id}, '', ${json(parsed)}, ${json(files)}, ${json(checks)}, ${status}, ${user!.id})
    RETURNING *`;
    await logEvent(
      passed ? "usecase.submitted" : "usecase.checks_failed",
      user!.id,
      { skillId: skill.id, versionId: version.id },
      { slug },
    );
    return { skill: skillView(skill), version: versionView(version), passed };
  },
  { roles: ["provider"] },
);
