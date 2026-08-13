import Link from "next/link";

export const metadata = {
  title: "How it works · Knowledgebase · Giga Skills Marketplace",
  description:
    "The pipeline from a public GitHub repository through automated checks and human review to an installable skill.",
};

export default function HowItWorksPage() {
  return (
    <>
      <h1>How it works</h1>
      <p className="docs-lead">
        The marketplace runs an app-store style pipeline: providers publish from source, the
        marketplace verifies, humans review, and agents install. No vendor, model, or tool lock-in
        at any step.
      </p>

      <h2>The pipeline</h2>
      <ol>
        <li>
          <strong>A provider publishes.</strong> The provider names a public GitHub repository.
          Every directory that holds a <code>SKILL.md</code> becomes one skill, and the submission
          is pinned to a commit, tag, or branch head. The marketplace fetches the repository
          server-side, so the stored files, stars, licence, and commit are marketplace-verified
          provenance. See <Link href="/knowledgebase/publishing">Publish and update skills</Link>.
        </li>
        <li>
          <strong>Automated checks run.</strong> Each skill bundle is validated at submission:
          manifest present and parseable, required fields, valid OpenAPI 3.x specs, valid JSON
          schemas, resolvable dependencies. The report travels with the submission as evidence -
          failing checks inform the reviewer, they never auto-reject. See{" "}
          <Link href="/knowledgebase/checks">Automated checks</Link>.
        </li>
        <li>
          <strong>A human reviews.</strong> A reviewer claims the submission, inspects the bundle,
          the check report, and the source repository, and approves, rejects, or requests changes.
          See <Link href="/knowledgebase/review">The review process</Link>.
        </li>
        <li>
          <strong>The skill is published.</strong> Approved skills appear in the public catalog
          under their provider, with a public review trail.
        </li>
        <li>
          <strong>Anyone installs.</strong> One command adds a provider’s skills to Claude Code,
          Codex, opencode, or Pi, straight from the source repository. See{" "}
          <Link href="/knowledgebase/installing">Install skills</Link>.
        </li>
      </ol>

      <h2>Updating a published skill</h2>
      <p>
        Updating a listing is resubmitting the repository at a new commit or tag. The new version
        goes through a fresh review while the published one stays live; on approval the new version
        supersedes the old one. Nothing is edited in place.
      </p>

      <h2>Why source-pinned publishing</h2>
      <p>
        Skills instruct AI agents, so their provenance matters. Because the marketplace fetches the
        repository itself and pins the submission to a commit, a published skill is exactly what was
        reviewed - not what the repository happens to contain later.
      </p>
    </>
  );
}
