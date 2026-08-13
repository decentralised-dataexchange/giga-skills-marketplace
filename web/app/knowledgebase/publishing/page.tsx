import Link from "next/link";

export const metadata = {
  title: "Publish and update skills · Knowledgebase · Giga Skills Marketplace",
  description:
    "Submit a public GitHub repository for review, track the submission, and ship updates as new pinned versions.",
};

export default function PublishingPage() {
  return (
    <>
      <h1>Publish and update skills</h1>
      <p className="docs-lead">
        Publishing means naming your repository: the marketplace fetches it, pins it to a commit,
        runs the automated checks, and hands the result to a human reviewer. You never upload files.
      </p>

      <h2>Submit a source</h2>
      <ol>
        <li>
          In the dashboard, open <strong>Publish</strong>.
        </li>
        <li>
          Paste the repository URL, e.g. <code>https://github.com/acme/acme-skills</code>.
        </li>
        <li>
          Optionally name a <strong>ref</strong> - a commit, tag, or branch. Left empty, the default
          branch’s latest commit is used.
        </li>
        <li>
          Optionally select which skill directories to submit; by default every directory with a{" "}
          <code>SKILL.md</code> is included.
        </li>
      </ol>
      <p>
        The server fetches the repository snapshot itself, so the stored files, stars, licence, and
        commit are marketplace-verified. The{" "}
        <Link href="/knowledgebase/checks">automated checks</Link> run immediately on every
        discovered skill; the source is then submitted as a whole, and each skill lands in the
        review queue as <code>submitted</code> with its check report attached as evidence for the
        reviewer.
      </p>
      <p>
        One submission carries up to 200 skills. A larger repository answers with its directory list
        instead, so you pick which skills to inspect and submit.
      </p>

      <div className="docs-callout">
        <p>
          GitHub rate-limits anonymous API calls (60 per hour per IP; a submission costs 3). If your
          marketplace host sets the optional <code>GITHUB_TOKEN</code>, the limit is much higher.
        </p>
      </div>

      <h2>Track the submission</h2>
      <p>
        <strong>Skill Sources</strong> lists every repository you publish from; open a source to see
        its skills, every submitted version with its status and the reviewer’s notes, and each
        version’s audit check report. If the reviewer requests changes, fix the repository and
        resubmit; the review trail keeps the history.
      </p>

      <h2>Update or delist a source</h2>
      <p>
        Updates and delisting act on the source, not on individual skills. Resubmit the repository
        at a new commit or tag and every skill it carries gets a new version through a fresh review;
        your published versions stay live and installable the whole time, superseded only on
        approval. Delisting a source removes every published skill it carries from the catalog
        together.
      </p>

      <h2>What happens on approval</h2>
      <p>
        The skill appears in the public catalog under your organisation - and if this is your first
        published skill, your organisation becomes publicly visible at the same moment. See{" "}
        <Link href="/knowledgebase/review">The review process</Link> for what reviewers do.
      </p>
    </>
  );
}
