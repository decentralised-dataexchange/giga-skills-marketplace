import Link from "next/link";

export const metadata = {
  title: "Data agreements · Knowledgebase · Giga Skills Marketplace",
  description:
    "How the education showcase records processing and consent: three data agreements, per-agreement opt-in and opt-out, and the right to be forgotten.",
};

export default function ShowcaseDataAgreementsPage() {
  return (
    <>
      <h1>Data agreements</h1>
      <p className="docs-lead">
        Every use of learner data in the showcase is grounded in a data agreement held in a consent
        service. At registration the learner is onboarded as an individual there, and a consent
        record is written against each agreement; the learner can change the optional ones at any
        time from the Education Portal, and every surface that shows a consent state reads it live
        from the consent service.
      </p>

      <h2>The three agreements</h2>
      <table>
        <thead>
          <tr>
            <th>Agreement</th>
            <th>Lawful basis</th>
            <th>Data attributes</th>
            <th>Learner control</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Core enrolment processing</td>
            <td>
              <code>public_task</code>
            </td>
            <td>Identity reference, application data</td>
            <td>
              Transparency record: registration itself is a public task and needs no consent, so
              this agreement documents the processing rather than asking permission
            </td>
          </tr>
          <tr>
            <td>Anonymised education analytics</td>
            <td>
              <code>consent</code>
            </td>
            <td>Anonymised learner statistics</td>
            <td>
              Fully optional opt-in at registration; opt-out at any time. Declining never affects
              registration or credentials
            </td>
          </tr>
          <tr>
            <td>Employer qualification sharing</td>
            <td>
              <code>consent</code>
            </td>
            <td>Qualification data</td>
            <td>
              Optional standing preference. Every actual share still requires Wallet approval of the
              specific request, field by field
            </td>
          </tr>
        </tbody>
      </table>

      <h2>How the records are used</h2>
      <ul>
        <li>
          <strong>At registration</strong>, the two optional choices on the form become consent
          records (<code>optIn</code> true or false) against the analytics and employer agreements,
          and the enrolment agreement is recorded as the transparency notice for the processing
          itself.
        </li>
        <li>
          <strong>In the Education Portal</strong>, the My data choices page lets the learner opt in
          or out of each optional agreement at any time; the change is written to the consent
          service immediately.
        </li>
        <li>
          <strong>In the school workbench</strong>, the reviewer sees the current consent states
          live from the consent service, not the snapshot from the submitted form, so a later
          opt-out is visible immediately.
        </li>
        <li>
          <strong>Consent complements the Wallet; it never replaces it.</strong> The employer
          sharing agreement records a standing preference, but each actual disclosure happens only
          when the learner approves that specific presentation request in the Wallet, as shown in
          the <Link href="/knowledgebase/showcase">walkthrough</Link>.
        </li>
      </ul>

      <h2>The right to be forgotten</h2>
      <p>
        The Education Portal carries a Delete my account action. It removes the learner&apos;s
        consent records from the consent service, then erases the local application, exchange
        records, profile, and sign-in account. Credentials already held in the Wallet stay with the
        holder, which is the point of a wallet: revocation through the status list, not deletion, is
        how an issued credential is withdrawn.
      </p>

      <h2>Auditability</h2>
      <p>
        Consent decisions, registrations, issuances, verifications and revocations are all written
        to the registry&apos;s append-only, hash-chained audit trail, which the showcase publishes
        read-only. Consent-record changes are also independently traceable in the consent
        service&apos;s own history.
      </p>
    </>
  );
}
