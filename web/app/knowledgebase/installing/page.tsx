import Link from "next/link";

export const metadata = {
  title: "Install skills · Knowledgebase · Giga Skills Marketplace",
  description:
    "Install published skills into Claude Code, Codex, opencode, or Pi with the skills CLI.",
};

export default function InstallingPage() {
  return (
    <>
      <h1>Install skills</h1>
      <p className="docs-lead">
        Published skills install straight from their source repository with the open-source{" "}
        <a href="https://github.com/vercel-labs/skills" target="_blank" rel="noopener">
          skills CLI
        </a>
        . One command, any supported agent, no marketplace account needed.
      </p>

      <h2>Commands</h2>
      <p>Install every skill a repository publishes:</p>
      <pre>
        <code>npx skills add &lt;owner&gt;/&lt;repo&gt;</code>
      </pre>
      <p>Install one skill from a repository:</p>
      <pre>
        <code>npx skills add &lt;owner&gt;/&lt;repo&gt; --skill &lt;name&gt;</code>
      </pre>
      <p>
        Every skill detail page and provider page shows its exact install command, ready to copy.
      </p>

      <h2>Supported agents</h2>
      <p>
        Skills follow the agent-agnostic <code>SKILL.md</code> convention, so they work in Claude
        Code, Codex, opencode, Pi, and any other agent that reads skill files. The CLI detects the
        agents on your machine and installs into the right place for each.
      </p>

      <h2>Finding skills</h2>
      <ul>
        <li>
          The <Link href="/">homepage catalog</Link> lists every visible provider with its skill
          count; search filters by name.
        </li>
        <li>
          Catalog URLs name the owner:{" "}
          <code>/marketplace/&lt;provider&gt;/&lt;source&gt;/&lt;skill&gt;</code>. A bare{" "}
          <code>/skill/&lt;slug&gt;</code> link redirects to the canonical page, because a slug
          often travels alone in an agent prompt. Skill names are unique per organisation, so when
          several providers publish the same name the bare link shows a chooser instead.
        </li>
        <li>
          Before installing, check the skill’s{" "}
          <Link href="/knowledgebase/review">public review trail</Link> and its source repository’s
          provenance - both are one click from the detail page.
        </li>
      </ul>
    </>
  );
}
