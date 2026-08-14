import Link from "next/link";

export const metadata = {
  title: "Skills · Knowledgebase · Giga Skills Marketplace",
  description:
    "What a skill is: a SKILL.md with reference files, published from a pinned GitHub source and reviewed before publication.",
};

export default function SkillsPage() {
  return (
    <>
      <h1>Skills</h1>
      <p className="docs-lead">
        A skill is a provider capability described by a <code>SKILL.md</code> plus optional
        reference files. It teaches an AI coding agent how to integrate a provider’s wallet
        correctly - which endpoints to call, which schemas to respect, which rules to follow.
      </p>

      <h2>Anatomy</h2>
      <p>One skill is one directory in a public GitHub repository:</p>
      <ul>
        <li>
          <code>SKILL.md</code> - a YAML manifest (name, description, licence, provider) followed by
          the instructions the agent reads.
        </li>
        <li>
          <code>openapi/</code> - OpenAPI 3.x specs for the APIs the skill integrates.
        </li>
        <li>
          <code>schemas/</code> - JSON schemas for credentials and records.
        </li>
        <li>
          <code>rulebooks/</code> - policy rules, kept separable from code.
        </li>
        <li>
          <code>references/</code> - any further reading the agent may need.
        </li>
      </ul>
      <p>
        The exact authoring rules live in{" "}
        <Link href="/knowledgebase/authoring">Author a skill</Link>.
      </p>

      <h2>Agent-agnostic by design</h2>
      <p>
        Skills follow the open <code>SKILL.md</code> convention, so the same skill works in Claude
        Code, Codex, opencode, Pi, and any other agent that reads skill files. The marketplace never
        rewrites a skill; it verifies and lists it.
      </p>

      <h2>Names</h2>
      <p>
        A skill’s name (its manifest <code>name</code>, the catalog slug) is unique inside one
        organisation, and each name belongs to one source. Different organisations can publish the
        same name - the catalog URL names the owner, so there is no collision.
      </p>

      <h2>Versions</h2>
      <p>
        Every submission is pinned to a commit, so a skill’s published version is immutable.
        Resubmitting the repository at a new commit or tag creates a new version that goes through
        review; on approval it supersedes the previous one. Each published skill exposes a public
        review trail of its automated checks and the approval audit.
      </p>
    </>
  );
}
