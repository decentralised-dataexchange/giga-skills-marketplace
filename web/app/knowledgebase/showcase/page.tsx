/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

export const metadata = {
  title: "Try the showcase · Knowledgebase · Giga Skills Marketplace",
  description:
    "A guided walkthrough of the National Learner Registry and Education Wallet showcase: wallet sign-in, verifiable credentials, payment, and selective disclosure.",
};

const SHOWCASE_URL = process.env.NEXT_PUBLIC_SHOWCASE_URL ?? "/showcase";

function Figure({ src, alt, caption }: { src: string; alt: string; caption: string }) {
  return (
    <figure>
      <img src={`/knowledgebase/showcase/${src}`} alt={alt} loading="lazy" />
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

export default function ShowcaseTryPage() {
  return (
    <>
      <h1>Try the showcase</h1>
      <p className="docs-lead">
        The National Learner Registry and Education Wallet showcase is a working demonstration of
        the education wallet building block: a learner registers with an identity credential from a
        Wallet on their phone, receives a Student ID and a diploma as verifiable credentials, pays
        the diploma fee with a payment credential, and applies for a job sharing only the fields
        the employer asks for. The whole journey takes about 12 minutes.
      </p>
      <p>
        Open the showcase at <a href={SHOWCASE_URL}>{"the showcase landing page"}</a>. A floating
        Demo guide on every screen carries the portal switcher and these instructions, and a
        pulsing highlight marks the next thing to click on each screen.
      </p>

      <h2>Before you start</h2>
      <p>Three things go onto your phone before the journey begins:</p>
      <ol>
        <li>
          <strong>A Wallet app.</strong> Download a Wallet such as the iGrant.io Data Wallet;{" "}
          <a href="https://docs.igrant.io/docs/data-wallet-tryitout/" rel="noreferrer">
            the try-it-out instructions
          </a>{" "}
          explain the install.
        </li>
        <li>
          <strong>A person identification credential (PID).</strong> Issue one to your Wallet from
          the <a href="https://igrant.io/demo/pid.html">demo PID issuer</a>. It signs you in as the
          learner.
        </li>
        <li>
          <strong>A payment credential.</strong> Issue a payment account credential to the same
          Wallet from the{" "}
          <a href="https://igrant.io/demo/ts12-payment-credential-issuance.html">
            demo payment credential issuer
          </a>
          . It confirms the diploma fee.
        </li>
      </ol>
      <Figure
        src="wallet-credentials.png"
        alt="The Wallet app on a phone listing the credentials it holds: a person identification credential, a payment card credential, a Student ID, and a diploma."
        caption="The Wallet with the journey's credentials in place. The person identification and payment credentials are the prerequisites; the Student ID and diploma arrive during the walkthrough."
      />

      <h2>Step 1: Register as a learner</h2>
      <p>
        Open the National Education Portal and choose to sign in with your wallet. The portal shows
        a QR code; scan it with the Wallet and share your person identification data. There is no
        account and no password: the verified attributes are the sign-in.
      </p>
      <Figure
        src="education-signin.png"
        alt="The National Education Portal sign-in page showing a QR code with the instruction to present person identification data from the wallet on your phone."
        caption="The education portal asks the Wallet for a person identification presentation instead of a password."
      />
      <Figure
        src="wallet-pid-share.png"
        alt="The Wallet consent sheet listing the person identification fields about to be shared with the National Ministry of Education: address, birthdate, email, family name and given name, with a Confirm button."
        caption="The Wallet shows exactly which identity fields the registry requests, and shares them only on Confirm."
      />
      <p>
        The registration form arrives prefilled from the shared identity data. Complete the
        remaining fields, make your two optional data choices (analytics and later employer
        sharing; both can be changed at any time), and submit.
      </p>
      <Figure
        src="education-register.png"
        alt="The registration form in the National Education Portal with document references filled in and two optional consent checkboxes for anonymised analytics and later employer sharing, above a Submit registration button."
        caption="Registration with document references and the two optional, revocable data choices."
      />

      <h2>Step 2: Document review; enrolment is automatic</h2>
      <p>
        In Riverside Admissions, the school officer opens the application and validates the
        documents. Everything after that click is automatic: the registry generates the learner
        identifier, creates the authoritative record, and offers the Student ID credential to the
        learner&apos;s Wallet.
      </p>
      <Figure
        src="school-review.png"
        alt="The Riverside Admissions review screen showing the submitted application, the current consent states from the consent service, passed document checks, and the confirmation that the learner was enrolled automatically and the Student ID was offered."
        caption="The school validates; the registry enrols automatically. The consent states shown are live from the consent service."
      />
      <p>
        Back in the Education Portal, the learner scans the Student ID offer and types the
        transaction code shown under the QR into the Wallet.
      </p>
      <Figure
        src="education-student-id.png"
        alt="The learner's home page in the National Education Portal showing the generated learner identifier and a QR code offering the Student ID credential, with a transaction code printed beneath."
        caption="The Student ID offer with its transaction code: a pre-authorised issuance that the Wallet completes."
      />
      <Figure
        src="wallet-transaction-code.png"
        alt="The Wallet asking for the one-time transaction code for the pre-authorised Student ID issuance, showing the Ministry seal and four code entry boxes."
        caption="The Wallet asks for the one-time code before accepting the pre-authorised issuance."
      />

      <h2>Step 3: Graduate, pay, and receive the diploma</h2>
      <p>
        In Riverside Admissions, submit the signed graduation decision. The registry validates the
        institution automatically and the diploma fee falls due for the learner.
      </p>
      <Figure
        src="school-graduation.png"
        alt="The graduation decision form in Riverside Admissions with programme, qualification code, final result and the signed decision text, above a submit button."
        caption="The school signs and submits the graduation decision; its text is hashed and referenced inside the diploma."
      />
      <p>
        In the Education Portal, choose to pay from your account or by card. One scan does both
        halves: the Wallet presents the chosen payment credential with the transaction details, and
        the diploma is issued to the Wallet in the same session.
      </p>
      <Figure
        src="wallet-payment.png"
        alt="The Wallet payment sheet showing a 50 euro amount, the payment card being used, and the payee Ministry of Education, with a Confirm Payment button."
        caption="The payment confirmation in the Wallet: the amount, the chosen payment credential, and the payee."
      />
      <Figure
        src="wallet-diploma-accept.png"
        alt="The Wallet issuance screen listing the diploma fields about to be added: learner name, qualification name and code, awarding institution, award date, programme, result, learner identifier and graduation decision hash, with an Accept button."
        caption="Straight after the payment, the diploma arrives in the same Wallet session."
      />

      <h2>Step 4: Apply for a job, sharing only five fields</h2>
      <p>
        Open CivicWorks Careers, pick the role, and apply with your wallet. The employer requests
        exactly three identity fields and five diploma fields; nothing else leaves the Wallet. The
        form fills itself from the shared data, and the diploma attestation becomes the evidence of
        qualification.
      </p>
      <Figure
        src="civicworks-apply.png"
        alt="A job listing for Junior Analyst, Public Services on CivicWorks Careers with a QR code inviting the candidate to apply with the wallet on their phone."
        caption="The job application QR: the employer's verifier asks for a person identification and diploma presentation."
      />
      <Figure
        src="wallet-civicworks-share.png"
        alt="The Wallet consent sheet for CivicWorks Employer expanded to show the exact fields being shared: email, family name and given name from the identity credential, and award date, awarding institution, learner name and qualification code from the diploma."
        caption="Selective disclosure in action: the Wallet lists the precise fields, and only those, before Confirm."
      />
      <Figure
        src="civicworks-verified.png"
        alt="The CivicWorks evidence of qualification panel showing the verified diploma with signature and integrity confirmed, the trusted issuer Ministry of Education from the trust list, and the revocation status not revoked at verification time."
        caption="The employer's proof: signature integrity, a trusted issuer from the trust list, and a live revocation check."
      />

      <h2>Step 5: Revoke and see trust in action</h2>
      <p>
        In Riverside Admissions, revoke the issued diploma; the registry processes it immediately
        and permanently through a status list. Apply again at CivicWorks: the verification must now
        reject the credential. Close on the{" "}
        <a href={`${SHOWCASE_URL}/audit`}>registry audit trail</a>, an append-only, hash-chained
        record of every step, including the automatic processing.
      </p>

      <h2>What is real and what is simulated</h2>
      <p>
        Wallet sign-in, credential issuance, verification, selective disclosure, revocation, and
        consent all run against live issuer, verifier, and consent services with x509 trust
        anchors registered on a trust list. The civil registry check, the payment ledger
        entry, the institution signature, and the education service registry are labelled sandbox
        representations. Every person and organisation in the showcase is fictional. The exact
        schemas are on the next two pages:{" "}
        <Link href="/knowledgebase/showcase-credentials">credentials and presentations</Link> and{" "}
        <Link href="/knowledgebase/showcase-data-agreements">data agreements</Link>.
      </p>
    </>
  );
}
