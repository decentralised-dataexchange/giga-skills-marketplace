import Link from "next/link";

export const metadata = {
  title: "How it was built with skills · Knowledgebase · Giga Skills Marketplace",
  description:
    "A guide for integrators: how the education showcase was built by an AI coding agent using the skills from this marketplace, which skill served which step, and the prompts that drove them.",
};

function Prompt({ children }: { children: React.ReactNode }) {
  return (
    <blockquote>
      <p>{children}</p>
    </blockquote>
  );
}

export default function ShowcaseBuildGuidePage() {
  return (
    <>
      <h1>How it was built with skills</h1>
      <p className="docs-lead">
        The whole <Link href="/knowledgebase/showcase">education showcase</Link> was built by an AI
        coding agent guided by the skills published on this marketplace. No SDK was hand-studied and
        no API reference was read by a human: for each integration step the agent loaded the
        matching skill, followed its contract, and validated against its done-criteria. This page
        maps every step to the skill that carried it, with the kind of prompt an integrator gives.
      </p>

      <h2>Setting up</h2>
      <p>Install the skills into your coding agent straight from the source repository:</p>
      <pre>
        <code>npx skills add l3-igrant/skills</code>
      </pre>
      <p>
        Then describe the product you want. The agent picks the right skill per task; your job is to
        make decisions when the skill&apos;s intake asks for them (environment, tenancy, where the
        backend runs) and to test with a real Wallet on a phone. The showcase, with its three
        portals, registry, issuance, payment, verification, revocation and consent, was built this
        way in a single working session, for example:
      </p>
      <Prompt>
        Build a National Learner Registry and Education Wallet showcase: a learner registers with a
        PID from their Wallet, receives a Student ID and a diploma as verifiable credentials, pays
        the diploma fee with a payment credential, and applies for a job with selective disclosure.
        Separate, real-world-looking portals under one domain. Next.js, SQLite, no low-code
        machinery.
      </Prompt>

      <h2>Step 1: orientation</h2>
      <p>
        <code>igrantio-ows-overview</code> is the map: the issuer and verifier architecture, the
        glossary, and an integrator intake that settles the environment, the API key, tenancy and
        webhook reachability one question at a time before any code is written. Load it first; every
        other skill assumes its vocabulary.
      </p>

      <h2>Step 2: one organisation per role</h2>
      <p>
        The registry (issuer) and the employer (verifier) must be separate organisations so the
        Wallet shows two genuinely different parties. <code>igrantio-api-sandboxes</code> created
        the two organisations with their own names and logos, and <code>igrantio-api-api-keys</code>{" "}
        issued a scoped API key bound to each, so every later call lands in the right organisation
        without extra headers.
      </p>
      <Prompt>
        Create appropriate sandbox organisations for the Ministry of Education and the employer,
        with logos, and bind a separate API key to each.
      </Prompt>

      <h2>Step 3: keys, certificates, trust</h2>
      <p>
        A Wallet warns about an untrusted service provider unless the requesting party&apos;s
        certificate is on a trust list. <code>igrantio-api-key-management</code> covered creating
        the signing keys, generating a certificate signing request per key, and uploading the signed
        chains; <code>igrantio-trustlist-entries</code> covered registering each certificate on the
        trust list as an OAuth2 client; and <code>igrantio-api-trust-anchor</code> explained how the
        issuer and verifier side consume those registrations. The showcase uses a separate key and
        certificate for each definition: Student ID issuance, diploma issuance, sign-in
        verification, payment verification, and the employer&apos;s check.
      </p>
      <Prompt>
        I am getting an untrusted service provider warning in the Wallet. Make sure every credential
        and presentation definition uses x509, use separate certificates for all definitions, and
        register them all on the trust list.
      </Prompt>

      <h2>Step 4: credential schemas</h2>
      <p>
        The claim sets came from the schema skills rather than guesswork:{" "}
        <code>igrantio-credential-schema-student-id</code> supplied the sixteen-claim student
        identity set the registry issues, <code>igrantio-credential-schema-pid</code> described the
        person identification credential the sign-in relies on, and{" "}
        <code>igrantio-credential-schema-sca-payment-account</code> (with its card counterpart)
        described the payment credentials the fee confirmation accepts. The exact resulting
        definitions are on the{" "}
        <Link href="/knowledgebase/showcase-credentials">credentials and presentations</Link> page.
      </p>

      <h2>Step 5: presentation queries</h2>
      <p>
        Each verification is a DCQL query naming exactly the fields it needs, nothing more.{" "}
        <code>igrantio-dcql-query-pid</code> shaped the five-field sign-in request,{" "}
        <code>igrantio-dcql-query-sca-payment-account</code> the payment presentations, and{" "}
        <code>igrantio-dcql-query-student-id</code> the education credential requests, including the
        employer&apos;s combined query for three identity fields plus five diploma fields.
      </p>
      <Prompt>
        The employer must request only the qualification fields it needs: name, qualification,
        awarding institution, qualification code and award date. Nothing else.
      </Prompt>

      <h2>Step 6: issuing credentials</h2>
      <p>
        <code>igrantio-issuer-backend</code> is the issuance contract: create the credential
        definition, start an issuance, correlate on the exchange identifier, and render the offer.
        The Student ID uses the pre-authorised code flow with a one-time transaction code shown
        under the QR, exactly as the skill documents it.
      </p>
      <Prompt>All issuances should use the pre-authorised code flow with a user PIN.</Prompt>

      <h2>Step 7: verifying, and paying inside an issuance</h2>
      <p>
        <code>igrantio-verifier-backend</code> covered ordinary verifications and the two special
        shapes the showcase leans on: transaction data, which binds the payment presentation to a
        signed amount and payee the Wallet displays before consent, and the dynamic credential
        request, where the diploma issuance embeds the payment presentation so one scan pays the fee
        and delivers the credential in the same Wallet session.
      </p>
      <Prompt>
        When the learner chooses pay by account or pay by card, make it a dynamic credential
        request: the Wallet presents the payment credential with the transaction data and the
        diploma is issued automatically in the same session.
      </Prompt>

      <h2>Step 8: hearing back, and showing it live</h2>
      <p>
        The backend learns that a Wallet scanned, presented or accepted through webhooks;{" "}
        <code>igrantio-backend-webhooks</code> supplied the signature verification (timestamped HMAC
        compared in constant time), the topic-to-exchange mapping, and the idempotent registration.{" "}
        <code>igrantio-backend-sse</code> then streams those stored events to the browser, so the QR
        flips to a progress state the moment the phone scans, with a polling fallback.{" "}
        <code>igrantio-qr-code</code> set the QR conventions: requests by reference, the right
        sizing and error correction, and a logo in the centre.
      </p>
      <Prompt>
        Make all the QR codes by-reference ones, and detect the scanning so the screen updates the
        moment the Wallet picks it up.
      </Prompt>

      <h2>Step 9: consent and the individual</h2>
      <p>
        <code>igrantio-individuals</code> established the pattern for onboarding each learner as an
        individual in the consent service, keyed to the local user so the mapping is recoverable.{" "}
        <code>igrantio-consent-records</code> covered recording an opt-in or opt-out against each
        data agreement, reading the live state (the school review shows it), and the delete-all call
        behind the learner&apos;s Delete my account. The resulting agreements are on the{" "}
        <Link href="/knowledgebase/showcase-data-agreements">data agreements</Link> page.
      </p>
      <Prompt>
        Create an individual in the consent service for each student and record consent against the
        data agreements. If the student opts out of analytics in the education portal, the school
        must see it immediately.
      </Prompt>

      <h2>What the integrator actually does</h2>
      <ul>
        <li>
          <strong>Decide, do not implement.</strong> The prompts above are decisions and acceptance
          criteria, not instructions on how to call an API. The skills carry the how.
        </li>
        <li>
          <strong>One skill per step.</strong> Load the overview first, then exactly the skill for
          the integration at hand. Each skill ends with done-criteria; hold the agent to them.
        </li>
        <li>
          <strong>Keep secrets server-side.</strong> Every skill assumes API keys live only in the
          backend environment; the browser talks to your own endpoints. The showcase enforces this
          with server-only modules, so a leaked key is a build error rather than an incident.
        </li>
        <li>
          <strong>Make provisioning idempotent.</strong> Definitions, webhooks and trust entries are
          created by a script that can run twice without duplicating anything, which the webhook
          skill models explicitly.
        </li>
        <li>
          <strong>Test with a real Wallet early.</strong> Webhooks need a publicly reachable HTTPS
          address even during development, and the trust warnings a Wallet shows are the fastest way
          to find a missing certificate registration. The phone finds what curl cannot.
        </li>
        <li>
          <strong>When behaviour surprises you, reread the skill.</strong> Almost every error in the
          build (a rejected transaction data shape, a missing interactive-authorisation flag, a
          header ignored under API-key authentication) was answered by a line already present in the
          loaded skill.
        </li>
      </ul>
    </>
  );
}
