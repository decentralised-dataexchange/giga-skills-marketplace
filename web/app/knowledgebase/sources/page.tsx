import Link from "next/link";

export const metadata = {
  title: "Source repositories · Knowledgebase · Giga Skills Marketplace",
  description:
    "How a public GitHub repository becomes a marketplace source: pinning, provenance, and the source page.",
};

export default function SourcesPage() {
  return (
    <>
      <h1>Source repositories</h1>
      <p className="docs-lead">
        A source is a public GitHub repository that a provider submits. The repository is the single
        source of truth: the marketplace fetches it server-side, pins the submission to a commit,
        and installs published skills straight from it. Each source is a first-class record owned by
        one organisation - it is submitted, reviewed, and delisted as a whole, and it is either{" "}
        <code>active</code> or <code>delisted</code>. Two organisations can publish the same
        repository; each gets its own independent source.
      </p>

      <h2>From repository to skills</h2>
      <p>
        Every directory in the repository that holds a <code>SKILL.md</code> becomes one skill. A
        repository can carry one skill or a whole catalogue; the provider can also submit only a
        chosen subset of directories. See{" "}
        <Link href="/knowledgebase/repository">Build a skills repository</Link> for layout advice.
      </p>

      <h2>Pinning</h2>
      <p>
        A submission names a commit, a tag, or a branch. A branch resolves to its head commit at
        submission time; if nothing is named, the default branch’s latest commit is used. Whatever
        was named, the stored bundle is the repository at exactly that commit - later pushes do not
        change what was reviewed or what is published.
      </p>

      <h2>Marketplace-verified provenance</h2>
      <p>
        Because the marketplace fetches the repository itself (never trusting an upload), each
        source carries verified metadata: the pinned deep link, stars, forks, licence, and last
        push. Reviewers see all of it during review, and the public source page shows it too.
      </p>

      <h2>The source page</h2>
      <p>
        Every source has a public page at <code>/marketplace/&lt;provider&gt;/&lt;source&gt;</code>,
        where <code>&lt;source&gt;</code> is the GitHub repository name. It lists the skills
        published from that repository, mirroring the{" "}
        <code>/&lt;owner&gt;/&lt;repo&gt;/&lt;skill&gt;</code> convention used on skills.sh.
      </p>
    </>
  );
}
