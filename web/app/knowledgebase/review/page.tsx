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
        Every submitted skill version is reviewed by a human before it can be published, with the
        automated check report as evidence alongside it. AI output stays a hypothesis until
        validated - the review is where the marketplace validates it.
      </p>

      <h2>The queue</h2>
      <p>
        Submissions wait in a shared queue. A reviewer <strong>claims</strong> a submission to work
        on it (its status becomes <code>in_review</code>); only the claiming reviewer - or a super
        admin - can decide it.
      </p>

      <h2>What the reviewer sees</h2>
      <ul>
        <li>
          The full bundle: <code>SKILL.md</code>, specs, schemas, rulebooks.
        </li>
        <li>
          The <Link href="/knowledgebase/checks">automated check report</Link>, including warnings.
        </li>
        <li>
          The source repository’s verified metadata: pinned deep link, stars, forks, licence, last
          push.
        </li>
      </ul>

      <h2>Decisions</h2>
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
              The version is <code>published</code>. A previously published version of the same
              skill is superseded.
            </td>
          </tr>
          <tr>
            <td>Request changes</td>
            <td>
              The version becomes <code>changes_requested</code> with the reviewer’s notes; the
              provider fixes the repository and resubmits.
            </td>
          </tr>
          <tr>
            <td>Reject</td>
            <td>
              The version is <code>rejected</code> with notes; nothing is published.
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
        A super admin can delist a published skill, which removes it from the catalog without
        rewriting its history. See <Link href="/knowledgebase/roles">Roles and statuses</Link>.
      </p>
    </>
  );
}
