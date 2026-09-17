# Build prompt: National Education Portal (the learner portal)

Assumes the shared foundation (the first prompt above) is provisioned: the six
definitions exist with their "(rebuild)" labels, the keys and trust-list
certificates are in place, and the environment variables are set. Give this
prompt to build the learner-facing portal.

Load `igrantio-ows-overview` first, then `igrantio-issuer-backend`,
`igrantio-verifier-backend`, `igrantio-qr-code`, `igrantio-individuals`,
`igrantio-consent-records`, `igrantio-usecase-ui`, `igrantio-frontend-client`,
and the schema and dcql skills named in the flows below.

---

> Build the **National Education Portal**, the learner-facing portal of the
> education showcase. It is a Next.js App Router portal under `/showcase/education`
> that talks to the Ministry of Education (MoE) OWS sandbox and the Consent
> Building Block. Every person and identifier is fictional. Follow the shared
> conventions (server-only OWS calls, browser-local demo store, SHA-256 audit
> chain, QR by reference, polling for status, never expose a key). Ground every
> field in the loaded skills; do not invent claim paths.

## Persona and brand

- Role `learner`: a citizen who signs in only with a wallet PID, never a
  password. There is no learner account on purpose.
- Product name "National Education Portal"; organisation "Government Education
  Services"; tagline "Enrolment, credentials and lifelong learning in one place".
- Palette (CSS vars on `div.edu[data-portal="education"]`): `--brand #1d4e89`,
  `--brand-dark #143a66`, `--brand-soft #e8f0fa`, `--accent #f2b134`,
  `--surface #f7f9fc`, `--card #ffffff`, `--ink #1a2733`, `--muted #5b6b7a`,
  `--line #d8e0e9`. Shared status tokens `--ok #1c7c43`, `--bad #b3261e` and soft
  variants.
- Logo `/showcase/portals/education/logo.svg`: a white coat-of-arms shield with
  an open book and a gold roundel. A separate Ministry seal
  `/showcase/portals/moe/logo.svg` (navy roundel with a column portico) is
  excavated in the centre of every MoE wallet QR.
- Government look: a thin state banner over a solid blue header with top nav,
  generous whitespace, large accessible forms; content column about 56rem.
- Footer: "National Education Portal is a fictional government service built for
  the ITU education wallet showcase."

## Shell (all screens)

`EducationShell`: a thin state banner "An official education service" / "English"
above a blue header with the logo, "National Education Portal" and "Government
Education Services". Nav when signed in: "My education" (home), "My data choices"
(consents), "Sign out"; when signed out: "Sign in with your wallet". Collapse the
nav to a hamburger dropdown under about 36rem. Footer prints the disclaimer.

## The three wallet flows

### Sign in with a PID (OpenID4VP presentation)

- Start (server, org moe): `POST /v3/config/digital-wallet/openid/sdjwt/
  verification/send` with `{ presentationDefinitionId:
  PID_PRESENTATION_DEFINITION_ID, requestByReference: true }`. Read
  `verificationHistory.presentationExchangeId` and `vpTokenQrCode` (QR by
  reference).
- The definition is "Learner PID sign-in (rebuild)"; it requests PID claims
  `given_name, family_name, birthdate, email, address` (skill
  `igrantio-dcql-query-pid`).
- The browser polls the status route (`org=moe, kind=presentation`) until a
  presentation-done topic arrives.
- Complete (server, org moe): `GET /v3/.../verification/history/{id}`; require
  `verified === true`; derive the pairwise pseudonym (HMAC with the pepper);
  return `{ pseudonym, displayName, prefill{ dateOfBirth, email, address } }` or
  null. No raw PID is stored.

### Receive the Student ID (OpenID4VCI pre-authorised code with a user PIN)

The school triggers issuance on approval; the learner sees the offer on Home.

- Issue (server, org moe): `POST /v2/config/digital-wallet/openid/sdjwt/
  credential/issue` with `issuanceMode: "InTime"`, `credentialDefinitionId:
  STUDENT_ID_CREDENTIAL_ID`, `urlScheme: "openid-credential-offer://"`,
  `userPin` = a random 4-digit transaction code, and `credential.vct:
  "VerifiableStudentID"`. Read `credentialHistory.credentialExchangeId` and
  `credentialOffer`. Validate the ULID against `^ULID-[0-9A-Z]{16}$`.
- The 16 claims issued (skill `igrantio-credential-schema-student-id`):
  `id` = ulid, `identifier` = ulid, `firstName`, `familyName`, `commonName` =
  displayName, `displayName`, `dateOfBirth`, `mail` = email,
  `eduPersonPrincipalName` = `{ulid-lowercase}@nlr.gov.example`,
  `eduPersonPrimaryAffiliation` = "student", `eduPersonAffiliation` =
  `["student","member"]`, `eduPersonScopedAffiliation` =
  `["student@riverside.school.example"]`, `eduPersonAssurance` =
  `["https://refeds.org/assurance/IAP/medium"]`, `schacHomeOrganization` =
  "riverside.school.example", `schacPersonalUniqueID` =
  `urn:schac:personalUniqueID:example:ULID:{ulid}`, `schacPersonalUniqueCode` =
  `["urn:schac:personalUniqueCode:example:nlr:{ulid}"]`.
- The learner sees a QR (from `credentialOffer`, MoE logo in centre) and a PIN
  chip "Transaction code: {pin}", entered in the wallet on accept.

### Pay the fee and receive the diploma (dynamic credential request)

Gated to `payment_pending`. The learner chooses account or card.

- Issue (server, org moe): `POST /v2/.../credential/issue` with `issuanceMode:
  "InTime"`, `credentialDefinitionId: DIPLOMA_CREDENTIAL_ID`, `urlScheme:
  "openid-credential-offer://"`, and `presentationDefinitionId` =
  `PAYMENT_CARD_PRESENTATION_DEFINITION_ID` for card else
  `PAYMENT_PRESENTATION_DEFINITION_ID`. **No userPin** (the dynamic request
  forbids one). Include `transactionData.payload`: `transaction_id` =
  applicationId, `date_time` = ISO now, `payee { name "Ministry of Education", id
  "ESR-MOE-0001", logo <MoE onboard image URL>, website <showcase URL> }`,
  `execution_date` = today, `currency "EUR"`, `amount 50`. Set `credential.vct:
  "urn:education:diploma:1"` with claims `learnerName, qualificationName =
  programme, qualificationCode, awardingInstitution, awardDate = today,
  programme, result, ulid, graduationDecisionHash`.
- The diploma credential definition sets `supportInteractiveAuthorisationEndpoint:
  true`; the payment credential is presented during issuance and the diploma
  follows in one wallet session (skills `igrantio-credential-schema-diploma`,
  `igrantio-verifier-backend`, `igrantio-dcql-query-sca-payment-account` and its
  card counterpart).
- The learner sees two buttons "Pay from account" and "Pay by card"; after start,
  one QR with waiting text "Scan with your wallet: approve the EUR 50 payment and
  receive your diploma." and a "Pay another way" link to switch method. A pending
  request persists and resumes on refresh.

## Screens and states

1. **`/showcase/education` Landing (public).** Hero "Your education records, in
   your own wallet" and a paragraph ending "Sign in with the identity wallet on
   your phone; no account or password is needed." CTA: signed-in "Go to my
   education" (home), else "Sign in with your wallet" (login). Three service
   cards: "Register as a learner" (links to the National Learner Registry audit
   trail), "Receive credentials", "Share on your terms". States: hydrating,
   signed-out, signed-in.
2. **`/showcase/education/login` Wallet sign-in.** If a session exists, replace to
   home. Card "Sign in with your wallet" / "Present your person identification
   data (PID) from the wallet on your phone. We use it to confirm who you are."
   Auto-start the PID request. Phases: `starting` ("Preparing your sign-in..."),
   `waiting` (QR by reference, deep link on same device, education logo in centre,
   hint "Scan this with the Wallet on your phone and share your PID.", "Start
   again"), `signing-in` ("Presentation received. Signing you in..."), `rejected`
   ("The presentation could not be verified."), `error` ("Something went wrong." +
   "Try again"). On success write the local learner profile and fake session
   (a returning pseudonym only refreshes the prefill), audit `learner.identified`,
   push to home.
3. **`/showcase/education/register` (guarded).** Redirect: no learner to login; an
   existing application to home. Hero "Register as a learner" plus an explanation
   that the name comes from the PID and a school officer reviews documents before
   the Ministry approves. Fields prefilled from the PID (each labelled "(from your
   PID)"): First name, Family name, Date of birth, Contact email, Home address; a
   School select (Riverside Secondary School); optional Prior education and
   Disability or special support; document reference inputs (defaults
   `DOC-BC-2026-00417`, `DOC-PA-2026-00291`, `DOC-PH-2026-00113`, optional prior
   record); a "Your data choices" block with the note "Enrolment processing itself
   is a public task and needs no consent. These two choices are separate,
   optional, and can be withdrawn at any time. Declining them does not affect your
   registration." and two optional checkboxes (analytics, employer sharing).
   Submit "Submit registration" / "Submitting...". On submit: create the
   application locally, then best-effort record consents (failure never blocks
   enrolment; store the individual id), push to home.
4. **`/showcase/education/home` My education (guarded).** Hero "Welcome, {name}"
   plus a status line: none "Start your learner registration. Your wallet has
   already confirmed your identity." (+ "Start registration"); submitted "Your
   application is with the school admissions office for document review. Once
   validated, you are enrolled automatically."; approved "You are enrolled. Add
   your Student ID to your wallet below."; payment_pending "The diploma fee is
   due. Pay with your wallet, and your diploma is issued in the same step.";
   issued "Your diploma has been issued. Add it to your wallet below." Cards:
   - Learner identifier (shows the ULID) when set.
   - Student ID (when an offer exists): accepted "Your Student ID is in your
     wallet."; else the text "Scan with your wallet to receive your selectively
     disclosable Student ID. The wallet will ask for the transaction code below.",
     the QR, waiting text "Waiting for your wallet to accept the Student ID...",
     and the PIN chip.
   - Diploma fee (payment_pending): the two payment buttons and the QR as above.
   - Diploma (issued): accepted "Your diploma is in your wallet (payment reference
     {ledgerRef}). You can now share it with an employer, on your terms."; else
     "Congratulations. Scan with your wallet to receive your diploma (payment
     reference {ledgerRef})." with the QR and waiting text "Waiting for your wallet
     to accept the diploma...".
   Every wallet card has states: empty, awaiting-wallet (QR), scanned (spinner
   "Scanned. Continue in the wallet on your phone..."), done (spinner "Done.
   Updating..."), success, already-done.
5. **`/showcase/education/consents` My data choices (guarded).** Hero "Your data
   choices". Empty: "No records yet" / "Your consent records appear here after you
   submit your registration." Per agreement: title, description, "Lawful basis:
   {basis}", "Status:" ("allowed" / "declined / withdrawn" for optional; "active
   (public task)" otherwise); an Opt in / Opt out button for optional agreements
   ("Saving..." while busy). A "Delete my account" card ("Removes your learner
   profile, your application, and your consent records... Credentials already in
   your wallet stay in your wallet; a revoked credential stays revoked.") with a
   red "Delete my account" / "Deleting..." button that erases remote consents
   (best-effort), audits `consent.erased_all` and `learner.account_deleted`,
   clears local data (keeping the audit trail), and hard-navigates to the landing.

## Consent (Consent Building Block, org main, header `X-ConsentBB-IndividualId`)

Three agreements: `enrolment` "Core enrolment processing" (lawful basis
`public_task`, not optional); `analytics` "Anonymised education analytics"
(`consent`, optional); `employer` "Employer qualification sharing" (`consent`,
optional). Ensure an individual idempotently (external id
`edu-showcase-{pseudonym[:24]}`; no PID attribute is sent). On registration set
enrolment optIn true (acknowledge the public task) and analytics and employer to
the checkbox choices. Opt in and opt out create then update the consent record.
Delete all is `DELETE /v2/service/individual/record`.

## Edge cases

Same-device (coarse pointer and small viewport) swaps the QR for a deep link. The
PID QR is by reference; the issuance QR carries the full `credentialOffer`. A
returning learner refreshes the prefill instead of recreating the profile. The
login screen skips the scan if a session exists. Register redirects when there is
no learner or an application already exists. Consent recording is best-effort.
The payment method is switchable until paid. Completion (ledger ref plus
`issued`) is written in the browser when a diploma-done topic is polled. Deleting
the account keeps the append-only audit trail and hard-navigates to re-arm the
guard.

## Acceptance criteria

1. No key or base URL ever reaches the browser; all OWS and consent calls are
   server-side.
2. Status comes only from polling the exchange record; no webhooks or SSE.
3. PID sign-in verifies a real presentation and derives a pairwise pseudonym; no
   raw PID is stored.
4. The Student ID is a pre-authorised offer with a 4-digit PIN.
5. The diploma is a dynamic credential request that presents the chosen TS12
   payment credential (account or card) with `transactionData` amount 50 EUR and
   payee "Ministry of Education", and issues the diploma in the same session with
   no PIN.
6. The definitions match the shared foundation exactly, with the "(rebuild)"
   labels.
