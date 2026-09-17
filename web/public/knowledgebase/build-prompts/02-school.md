# Build prompt: Riverside Admissions (the school portal)

Assumes the shared foundation (the first prompt above) is provisioned. Give this
prompt to build the school admissions-office workbench.

Load `igrantio-ows-overview` first, then `igrantio-usecase-ui`,
`igrantio-frontend-client`, `igrantio-issuer-backend`,
`igrantio-credential-schema-student-id`, `igrantio-credential-schema-diploma`,
`igrantio-individuals`, `igrantio-consent-records`.

---

> Build **Riverside Admissions**, the school portal of the education showcase: the
> admissions and registrar workbench for Riverside Secondary School, under
> `/showcase/school`. The officer does two jobs: manual document review that
> enrols a learner (and issues the Student ID), and signing the graduation
> decision that leads to the diploma. The Ministry of Education has no UI;
> enrolment, issuance and revocation processing run automatically in the browser
> registry. Follow the shared conventions. Ground every OWS field in the loaded
> skills.

## Persona and brand

- Role `school_officer`: the admissions or registrar officer.
- Product name "Riverside Admissions"; organisation "Riverside Secondary School";
  tagline "Admissions office workbench".
- Palette (CSS vars on `div.sch[data-portal="school"]`): `--brand #2e7d4f`,
  `--brand-dark #215c3a`, `--brand-soft #e9f5ee`, `--accent #e0a83d`,
  `--surface #f6f8f4`, `--card #ffffff`, `--ink #22301f`, `--muted #63705f`,
  `--line #d9e2d4`.
- Logo `/showcase/portals/school/logo.svg`.
- Look: compact and warm; a crest header (logo, org name, "Riverside Admissions
  workbench" subtitle, officer name, Sign out pill) with tab nav ("Review queue"
  / "Graduation decisions"); a two-pane workbench (a 19rem queue column plus a
  detail card); rounded 12px cards; small dense type. Single column under 48rem;
  hide the subtitle and officer name under 36rem.
- Footer: "Riverside Secondary School is a fictional institution. Sandbox data
  only."

## Demo entry

There is one demo officer account (prefill the login form with it): email
`officer@riverside.school`, password `officer123`, name "Amina Osei", label
"Admissions officer (document review, graduation decisions)". Auth is fake: check
the email and password in the browser against the demo account, write
`session.school`, and push to the queue. A client guard redirects to the login
when there is no school session; render blank until hydrated to avoid flicker.

The institution registry entry is `{ id "ins-riverside", name "Riverside
Secondary School", kind "school", esrRef "ESR-SCH-0042" }`. There are no seeded
applicants; the queue is empty until a learner registers in the education portal.

## Screens and states

1. **`/showcase/school/login`.** Centred card: crest, "Riverside Secondary
   School", subtitle "Admissions office staff sign-in", email and password form
   prefilled with the demo account, primary "Open workbench" ("Signing in..."
   while busy). Mismatch: "Sign-in failed. Please try again." If a valid session
   exists, redirect to the queue.
2. **`/showcase/school/queue` Review queue (two-pane).** Chrome = the crest header
   and tabs with "Review queue" active. Left pane head "Applications": the list is
   `applications` where status is `submitted` or `approved`, sorted by
   `updatedAt` desc, each linking to `?app={id}` and showing the learner name and
   subline "{Awaiting review | Enrolled} - {createdAt date}". A `submitted` item
   pulses when nothing is selected.
   - Empty queue: "No applications yet. New learner registrations appear here for
     manual document review."
   - No selection: heading "Manual document review" plus body "Select an
     application from the queue to check the uploaded documents against the civil
     registry and confirm prior education records. Validation enrols the learner
     automatically and offers the Student ID to their wallet."
   - Selected `submitted`: heading the learner name; subline "Applied to
     {institutionName} - submitted {date}"; a read-only "Application as submitted"
     form (First name, Family name, Date of birth, Contact email, Home address,
     School, Prior education [or "None given"], Disability or special support
     needs [or "None given"]); the consent block (below); a "Documents" list with
     each line suffixed "- civil registry: passed"; and the primary "Validate
     documents and enrol the learner" ("Validating..." while busy). Errors show in
     a login-error box.
   - Selected `approved`: green "Validated. The learner was enrolled automatically
     and the Student ID issued. The student should now go to the National
     Education Portal and receive the Student ID by scanning the QR code."
3. **`/showcase/school/graduation` Graduation decisions.** Chrome with the
   "Graduation decisions" tab active. `ready` = approved applications; `sent` =
   applications in `payment_pending` or `issued`.
   - Empty (no ready): "No approved learners are awaiting a graduation decision."
     plus, when any are sent, " {n} decision(s) already submitted."
   - Ready applicant: one form per approved application, heading the learner name,
     fields with defaults: Programme "Upper Secondary Diploma, Natural Sciences";
     Qualification code "NQF-4-NATSCI"; Final result "Pass with distinction"; a
     "Signed decision text (hashed and referenced in the diploma)" textarea
     defaulting to "Graduation decision for {learnerName}: programme completed,
     board decision 2026-06-12."; a muted note "Signed by the institution. On
     submission the registry validates the institution and asks the learner to pay
     the diploma fee; the diploma is issued to their wallet in the same payment
     step."; and a "Submit signed graduation decision" button ("Submitting...").
   - Submitted decisions: heading "Submitted decisions"; per sent application the
     learner name plus: for `payment_pending` "The student should now go to the
     National Education Portal and pay with their bank account or bank card and
     receive the diploma to their wallet."; for `issued` and not revoked, green
     "Diploma issued to the learner's wallet." plus muted "Revocation is permanent
     and takes effect immediately: a fresh verification anywhere rejects the
     credential." plus a red "Revoke the diploma" button ("Revoking..."); for
     revoked, red "Diploma revoked on {date}. Fresh verifications reject it."

## The validate action (document review to enrolment to Student ID)

1. `validateDocumentsAndApprove(applicationId)` in the browser: assert status is
   `submitted` (else "The application is not awaiting review."); audit
   `application.documents_validated` with `{ civilRegistryCheck:
   "sandbox:passed" }`; mint a ULID; if the current learner pseudonym matches the
   application, write `learner.ulid`; set status `approved`; audit
   `application.approved` with `{ ulid, processing: "automatic" }`. Return
   `{ ulid, claims }` where claims are `ulid, firstName, familyName, displayName,
   dateOfBirth, email`.
2. `issueStudentId(claims)` server action (org moe): the pre-authorised Student ID
   issuance defined in the learner prompt (`/v2/.../credential/issue`, InTime,
   `userPin`, vct `VerifiableStudentID`, the 16 registry claims). Returns
   `{ exchangeId, offer, pin }`.
3. `attachStudentIdOffer(applicationId, offer)` in the browser: store the offer,
   exchange id and pin on the application form; `patchExchange` with
   `{ direction: "issuance", credentialType: "student-id", applicationId, status:
   "offer_sent" }`; audit `credential.student_id_offered`. The school does not
   render the QR; the education portal does.

## The submit-graduation action (hashing, ESR check, payment gate)

`submitGraduation(applicationId, { programme, qualificationCode, result,
decisionText })`:

1. Assert status is `approved` (else "The application is not ready for a
   graduation decision.").
2. Hash the decision text: `graduationDocHash = sha256(decisionText)` (WebCrypto
   SHA-256, lowercase 64-char hex; use the same helper as the audit chain).
3. Patch the application: `{ programme, qualificationCode, result,
   graduationDocHash, status: "graduation_submitted" }`.
4. Audit `graduation.submitted` with `{ programme, qualificationCode,
   documentHash: graduationDocHash, institutionSignature: "sandbox:tsp-signed" }`.
   The sandbox Trust Service Provider marker stands in for a qualified signature;
   it is an audit-payload marker, not a diploma claim.
5. Education Service Registry check: if the application `esrRef` does not start
   with `ESR-`, throw "The institution is not authorised in the Education Service
   Registry."; audit `graduation.institution_validated` with `{ esrRef, registry:
   "sandbox" }`.
6. Set status `payment_pending`; audit `graduation.payment_required`. The school
   stops here; it does not issue the diploma.

The learner completes the diploma in the education portal. Its payment step reads
this application and embeds `graduationDecisionHash` (this hash) and `ulid` (the
learner ULID) and `awardingInstitution` (the institution name) into the diploma
credential (`vct urn:education:diploma:1`) as a dynamic credential request behind
the EUR 50 payment.

## The revoke action

`revokeIssuedDiploma(owsExchangeId)` server action (org moe): `PUT
/v2/config/digital-wallet/openid/sdjwt/credential/history/{exchangeId}/
revocation-status` with `{ revocationStatus: "Revoked" }`. Then
`markDiplomaRevoked(applicationId, owsExchangeId)` in the browser:
`patchExchange({ revoked: true, revokedAt: now })`; audit
`credential.diploma_revoked`. Find the exchange with
`getDiplomaExchange(state, applicationId)`. Revocation is permanent; a fresh
employer verification then rejects the credential.

## Consent visibility

The queue detail shows the learner's consent state. The fallback source is the
submitted form flags `consentAnalytics` and `consentEmployerSharing`. The live
source: when the current learner pseudonym matches the selected application and
`learner.individualId` exists, call `readLearnerConsents(individualId)` (Consent
BB, org main: for each agreement `GET /v2/service/individual/record/
data-agreement/{agreementId}` with header `X-ConsentBB-IndividualId:
{individualId}`, read `consentRecord.optIn`) and override the two flags by key
`analytics` and `employer`. Render two disabled read-only checkboxes: "Anonymised
analytics for policy planning (optional)" and "Later qualification sharing with an
employer (optional)", plus the note "Current status from the consent service; the
learner can change these at any time in the Education Portal." On a fetch failure
keep the form snapshot. The school only reads consent; it never writes it.

## Cross-portal rules

The school reads the shared `applications` array and the `learner` profile, both
written by the learner in the education portal. It writes `learner.ulid` (on
validate), the status transitions, the Student ID offer fields on the form (the
education portal renders the QR), `programme`/`qualificationCode`/`result`/
`graduationDocHash`, exchange records, and audit events. The school does not poll
OWS; the `payment_pending -> issued` transition is written by the education
portal's own polling, and the "Submitted decisions" list re-renders from the same
reactive store, so a diploma issued elsewhere shows as issued automatically.

## Edge cases

"None given" fallback for empty prior education or special support. The queue
shows only `submitted` and `approved`. Re-validating a non-submitted application
throws "The application is not awaiting review." Submitting graduation on a
non-approved application throws "The application is not ready for a graduation
decision." An ESR failure throws the authorisation error. OWS errors are masked
to generic strings; log detail server-side only. The revoke button appears only
for issued, not-yet-revoked diplomas. `graduationDecisionHash` is clamped to 64
chars server-side.

## Acceptance walkthrough

1. The officer signs in with the prefilled demo account and lands on the queue.
2. With no learner registration yet, the queue reads "No applications yet...".
3. After the learner registers, a `submitted` application appears with a pulsing
   hint; selecting it shows the read-only application, the two consent checkboxes
   reflecting the learner's live consent state, and the documents marked "civil
   registry: passed".
4. "Validate documents and enrol the learner" mints a ULID, sets `approved`,
   issues a real Student ID offer with a transaction-code PIN, and shows the
   enrolled confirmation.
5. On Graduation decisions the approved learner appears; submitting the decision
   SHA-256-hashes the text, records `institutionSignature: "sandbox:tsp-signed"`,
   passes the `ESR-` check, and sets `payment_pending`.
6. After the learner pays, the row shows "Diploma issued to the learner's wallet."
   with a "Revoke the diploma" button; revoking calls OWS revocation and the row
   shows "Diploma revoked on {date}.", and a fresh employer verification rejects
   the diploma.
