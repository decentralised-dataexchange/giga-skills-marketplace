import Link from "next/link";

export const metadata = {
  title: "Roles and statuses · Knowledgebase · Giga Skills Marketplace",
  description: "The marketplace roles and every status a skill version or organisation can hold.",
};

export default function RolesPage() {
  return (
    <>
      <h1>Roles and statuses</h1>
      <p className="docs-lead">
        Three roles run the marketplace, and every skill version moves through a small, explicit set
        of statuses. Nothing is published implicitly.
      </p>

      <h2>Roles</h2>
      <table>
        <thead>
          <tr>
            <th>Role</th>
            <th>Can do</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>provider</code>
            </td>
            <td>
              Register an organisation (instant, no approval step) and publish skills for review.
              The only role a visitor can claim at registration.
            </td>
          </tr>
          <tr>
            <td>
              <code>reviewer</code>
            </td>
            <td>
              Governance: claim submissions from the review queue, inspect bundles and check
              reports, approve, reject, or request changes.
            </td>
          </tr>
          <tr>
            <td>
              <code>superadmin</code>
            </td>
            <td>
              Everything a reviewer can, plus manage organisations, users and roles, suspend
              accounts, and delist skills.
            </td>
          </tr>
        </tbody>
      </table>
      <p>Governance roles are granted by a super admin and can never be self-assigned.</p>

      <h2>Skill version statuses</h2>
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>Meaning</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>submitted</code>
            </td>
            <td>
              Waiting in the review queue, with its{" "}
              <Link href="/knowledgebase/checks">automated check</Link> report attached as evidence.
            </td>
          </tr>
          <tr>
            <td>
              <code>in_review</code>
            </td>
            <td>A reviewer has claimed it.</td>
          </tr>
          <tr>
            <td>
              <code>changes_requested</code>
            </td>
            <td>Sent back with notes; the provider fixes and resubmits.</td>
          </tr>
          <tr>
            <td>
              <code>rejected</code>
            </td>
            <td>Declined with notes; nothing published.</td>
          </tr>
          <tr>
            <td>
              <code>published</code>
            </td>
            <td>Live in the catalog with a public review trail.</td>
          </tr>
          <tr>
            <td>
              <code>superseded</code>
            </td>
            <td>Replaced by a newer approved version of the same skill.</td>
          </tr>
        </tbody>
      </table>

      <h2>Skill and source statuses</h2>
      <p>
        The skill itself is <code>in_submission</code> until its first version is approved,{" "}
        <code>published</code> while a version is live, and <code>delisted</code> when it is removed
        from the catalog. The source that carries the skills is <code>active</code> or{" "}
        <code>delisted</code>; the owning provider (or a super admin) delists a source in one
        action, and every published skill in it leaves the catalog together. Skill names are unique
        per organisation, so two providers can publish the same name without conflict.
      </p>

      <h2>Organisation visibility</h2>
      <p>
        Organisations have no approval step. They are publicly visible only while they have at least
        one published skill; a super admin can reject an organisation (removing its publishing
        rights) or delete it with everything it published. See{" "}
        <Link href="/knowledgebase/providers">Providers</Link>.
      </p>
    </>
  );
}
