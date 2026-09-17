import Link from "next/link";

export const metadata = {
  title: "How it was built with skills · Knowledgebase · ITU Skills Marketplace",
  description:
    "A guide for integrators: how the National Education Portal (a learner signs in with a PID, receives a Student ID, and then receives a diploma after paying the fee by card or account) was built by an AI coding agent using the skills from this marketplace.",
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
        The <Link href="/knowledgebase/showcase">National Education Portal</Link> was built by an AI
        coding agent guided by the skills published on this marketplace. This guide covers the
        learner journey only: a student signs in with a PID from their Wallet, receives a Student ID
        card, and then receives a diploma card after paying the diploma fee by card or account. No
        SDK was hand-studied and no API reference was read by a human: for each step the agent loaded
        the matching skill, followed its contract, and validated against its done-criteria. This
        page maps every step to the skill that carried it, with the kind of prompt an integrator
        gives.
      </p>

      <h2>Before you start</h2>
      <p>
        Two things gate the whole build and are easy to skip. Plan for both from the start; the
        build works against a real Wallet only when both are done.
      </p>
      <ul>
        <li>
          <strong>API keys.</strong> One OWS API key for the Ministry of Education organisation,
          which acts as the issuer and as the sign-in and payment verifier. The key stays on the
          server, in an environment variable or a secret manager; the browser never sees it. Step 2
          creates the key.
        </li>
        <li>
          <strong>Trust list registrations.</strong> One x509 certificate per definition, registered
          on the trust list, so the Wallet trusts the credentials and the requests. The issuer
          certificates (Student ID, diploma) go on the NXD Pub-EAA list; the verifier certificates
          (sign-in, payment) go on the NXD WRPAC list. Until a certificate answers{" "}
          <code>granted</code>, the Wallet shows an untrusted service provider warning. Step 3
          covers this.
        </li>
      </ul>
      <p>You also need:</p>
      <ul>
        <li>
          A tenant account on the iGrant.io Organisation Wallet Suite (OWS) with the ability to
          create sandbox organisations. Environment: demo (<code>https://demo-api.igrant.io</code>).
        </li>
        <li>An AI coding agent and a model.</li>
        <li>
          The iGrant.io Data Wallet on a phone, with a PID and a payment credential from the two
          demo issuers.
        </li>
        <li>A clean working directory.</li>
      </ul>

      <h2>Setting up</h2>
      <p>Install the skills into your coding agent straight from the source repository:</p>
      <pre>
        <code>npx skills add l3-igrant/skills</code>
      </pre>
      <p>
        To pick exactly the skills this portal uses, open the{" "}
        <Link href="/marketplace/igrant-io/skills">skills repository</Link>, filter by the{" "}
        <strong>education</strong> category, select all, and copy the one install command it builds.
      </p>
      <p>
        Then describe the product you want. The agent picks the right skill per task; your job is to
        make decisions when the skill&apos;s intake asks for them (environment, tenancy, where the
        backend runs) and to test with a real Wallet on a phone. The portal, with its PID sign-in,
        Student ID and diploma issuance, and fee payment, was built this way in a single working
        session, for example:
      </p>
      <Prompt>
        Build a National Education Portal for a learner: they sign in with a PID from their Wallet,
        receive a Student ID as a verifiable credential, and then receive a diploma after paying the
        diploma fee with a payment credential, by card or account. Next.js, browser-local demo
        state, no low-code machinery.
      </Prompt>

      <h2>Step 1: orientation</h2>
      <p>
        <code>igrantio-ows-overview</code> is the map: the issuer and verifier architecture, the
        glossary, and an integrator intake that settles the environment, the API key, tenancy and
        webhook reachability one question at a time before any code is written. Load it first; every
        other skill assumes its vocabulary.
      </p>

      <h2>Step 2: the organisation and its key</h2>
      <p>
        The portal runs on one organisation, the Ministry of Education, which issues the Student ID
        and the diploma and verifies the sign-in and the payment.{" "}
        <code>igrantio-api-sandboxes</code> created the sandbox organisation with its name and logo,
        and <code>igrantio-api-api-keys</code> issued a scoped API key bound to it, so every later
        call lands in the right organisation without extra headers.
      </p>
      <Prompt>
        Create a sandbox organisation for the Ministry of Education, with a logo, and bind a scoped
        API key to it.
      </Prompt>

      <h2>Step 3: keys, certificates, trust</h2>
      <p>
        A Wallet warns about an untrusted service provider unless the requesting party&apos;s
        certificate is on a trust list. <code>igrantio-api-key-management</code> covered creating the
        signing keys, generating a certificate signing request per key, and uploading the signed
        chains; <code>igrantio-trustlist-entries</code> covered registering each certificate on the
        trust list as an OAuth2 client; and <code>igrantio-api-trust-anchor</code> explained how the
        issuer and verifier side consume those registrations. The portal uses a separate key and
        certificate for each definition: Student ID issuance, diploma issuance, sign-in
        verification, and payment verification.
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
        identity set the registry issues, <code>igrantio-credential-schema-diploma</code> the
        nine-claim diploma the registry issues to the learner,{" "}
        <code>igrantio-credential-schema-pid</code> described the person identification credential
        the sign-in relies on, and <code>igrantio-credential-schema-sca-payment-account</code> (with
        its card counterpart) described the payment credentials the fee confirmation accepts. The
        exact resulting definitions are on the{" "}
        <Link href="/knowledgebase/showcase-credentials">credentials and presentations</Link> page.
      </p>
      <Prompt>
        Create the credential definitions with the exact claim fields but fresh, unique labels so
        nothing existing breaks: a sixteen-claim Student ID and a nine-claim diploma. Turn on
        revocation, and enable the interactive authorisation endpoint on the diploma so it can be
        issued during the payment.
      </Prompt>

      <h2>Step 5: presentation queries</h2>
      <p>
        Each verification is a DCQL query naming exactly the fields it needs, nothing more.{" "}
        <code>igrantio-dcql-query-pid</code> shaped the sign-in request, and{" "}
        <code>igrantio-dcql-query-sca-payment-account</code> (with its card counterpart) shaped the
        fee confirmation, which carries the transaction data the Wallet shows before consent.
      </p>
      <Prompt>
        The sign-in should request only the PID fields it needs. The fee confirmation should request
        the payment credential and carry the transaction data: the amount and the payee.
      </Prompt>

      <h2>Step 6: issuing credentials</h2>
      <p>
        <code>igrantio-issuer-backend</code> is the issuance contract: create the credential
        definition, start an issuance, correlate on the exchange identifier, and render the offer.
        The Student ID uses the pre-authorised code flow with a one-time transaction code shown
        under the QR, exactly as the skill documents it.
      </p>
      <Prompt>All issuances should use the pre-authorised code flow with a user PIN.</Prompt>

      <h2>Step 7: paying inside an issuance</h2>
      <p>
        <code>igrantio-verifier-backend</code> covered the two special shapes the diploma leans on:
        transaction data, which binds the payment presentation to a signed amount and payee the
        Wallet displays before consent, and the dynamic credential request, where the diploma
        issuance embeds the payment presentation so one scan pays the fee and delivers the credential
        in the same Wallet session.
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
          backend environment; the browser talks to your own endpoints. The portal enforces this
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
