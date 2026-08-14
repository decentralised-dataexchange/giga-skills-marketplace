import Link from "next/link";

export const metadata = {
  title: "The review process · Knowledgebase · Giga Skills Marketplace",
  description:
    "How submissions move through the review queue: claiming, inspection, decisions, and the public review trail.",
};

export default function ReviewPage() {
  return (
    <>
      <h1>The review process</h1>
      <p className="docs-lead">
        Every submitted skill source is reviewed by a human before its skills can be published, with
        each skill’s automated check report as evidence alongside it. AI output stays a hypothesis
        until validated - the review is where the marketplace validates it.
      </p>

      <h2>The queue</h2>
      <p>
        The queue lists <strong>source submissions</strong>: one row per publish action, however
        many skills the source carries. A reviewer <strong>claims</strong> a submission to work on
        it (its status becomes <code>in_review</code>); only the claiming reviewer - or a super
        admin - can decide it, and the decision covers every skill in the submission.
      </p>

      <h2>What the reviewer sees</h2>
      <ul>
        <li>
          The source’s verified repository metadata, snapshotted at submission: pinned deep link,
          stars, forks, licence, last push.
        </li>
        <li>
          Every skill in the submission, exactly as it was pinned at submission time. Each skill
          opens on its own with its full bundle - <code>SKILL.md</code>, specs, schemas, rulebooks.
        </li>
        <li>
          Each skill’s <Link href="/knowledgebase/checks">automated check report</Link>, including
          warnings, plus a source-wide summary.
        </li>
      </ul>

      <h2>Decisions</h2>
      <p>A decision applies to the submission as a whole - every skill in it, all or nothing.</p>
      <table>
        <thead>
          <tr>
            <th>Decision</th>
            <th>Effect</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Approve</td>
            <td>
              Every version in the submission is <code>published</code>. Previously published
              versions of the same skills are superseded, and an archived source returns to the
              catalog.
            </td>
          </tr>
          <tr>
            <td>Request changes</td>
            <td>
              Every version becomes <code>changes_requested</code> with the reviewer’s notes; the
              provider fixes the repository and resubmits the source.
            </td>
          </tr>
          <tr>
            <td>Reject</td>
            <td>
              Every version is <code>rejected</code> with notes; nothing is published.
            </td>
          </tr>
        </tbody>
      </table>

      <h2>The public review trail</h2>
      <p>
        Every published skill exposes its assurance history at{" "}
        <code>/marketplace/&lt;provider&gt;/&lt;source&gt;/&lt;skill&gt;/review</code>: the check
        results and the approval audit. Trust in the catalog is inspectable, not asserted.
      </p>

      <h2>After publication</h2>
      <p>
        The owning provider - or a super admin - can archive a whole source in one action: the
        source record and every published skill it carries leave the catalog together, and any
        submission of the source still waiting in this queue is withdrawn. History is not rewritten
        (the review trail stays public). Resubmitting the source relists it through a fresh review.
        See <Link href="/knowledgebase/roles">Roles and statuses</Link>.
      </p>
    </>
  );
}
