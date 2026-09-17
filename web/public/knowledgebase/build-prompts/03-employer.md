# Build prompt: CivicWorks Careers (the employer portal)

Assumes the shared foundation (the first prompt above) is provisioned, including
the "Diploma qualification check (rebuild)" presentation definition under the
CivicWorks sandbox. Give this prompt to build the employer portal.

Load `igrantio-ows-overview` first, then `igrantio-dcql-query-diploma`,
`igrantio-verifier-backend`, `igrantio-qr-code`, `igrantio-usecase-ui`,
`igrantio-frontend-client`.

---

> Build **CivicWorks Careers**, the employer portal of the education showcase: a
> fictional employer's public job board where a candidate applies to a role and
> proves their qualification with an EUDI Wallet. It is a relying party
> (OpenID4VP verifier) on the CivicWorks OWS sandbox, under
> `/showcase/civicworks`. The candidate is an anonymous visitor: there is no
> employer login and no back office. Follow the shared conventions. Ground every
> OWS field in the loaded skills; do not invent claim paths.

## Persona and brand

- An employer or hiring team. Tagline "Apply with the qualifications in your
  wallet."
- Product name "CivicWorks Careers"; organisation "CivicWorks AB".
- Palette (CSS vars on `[data-portal="civicworks"]`): `--brand #0e7c7b`,
  `--brand-dark #0a5958`, `--brand-soft #e6f4f4`, `--accent #ff6b4a`,
  `--surface #fafbfc`, `--card #ffffff`, `--ink #17252a`, `--muted #5f7078`,
  `--line #dde5e8`.
- Logo: an inline SVG wordmark that renders "Civic" plus "Works", with "Works"
  tinted the accent colour.
- Look: a modern corporate HR SaaS. Pill buttons, a light sticky marketing header
  with a coral accent, a card grid, soft shadows. The furthest look from the
  government portals.
- Footer: "CivicWorks AB is a fictional employer. Verification results come from
  the OWS sandbox."

## Demo entry and seeded jobs

No login. Header and footer only. Seed four static job postings, each with
`slug, title, team, location, type, salary, tags[], blurb, requirement, about,
responsibilities[], offer[]`. Every job's `requirement` is exactly "Upper
secondary diploma (verified from your wallet)".

1. `junior-analyst` - "Junior Analyst, Public Services", Analytics, Stockholm,
   Full time, "SEK 34 000-39 000/month", tags [SQL, Dashboards, Public sector].
2. `service-designer` - "Service Designer", Design, "Stockholm - Hybrid", Full
   time, "SEK 42 000-48 000/month", tags [Research, Prototyping, Accessibility].
3. `operations-coordinator` - "Operations Coordinator", Operations, Gothenburg,
   Full time, "SEK 31 000-35 000/month", tags [Scheduling, Logistics].
4. `data-engineer-intern` - "Data Engineering Intern", Analytics, "Remote
   (Sweden)", "Internship - 6 months", "SEK 22 000/month", tags [Python,
   Pipelines].

`getJob(slug)` returns the match, or the first job for an unknown or empty slug.
There are no seeded applicants; the candidate is anonymous.

## Screens and states

1. **`/showcase/civicworks` Job board.** Sticky header (logo home; "Careers"; a
   ghost pill "Apply with your wallet" that opens the apply page for the first
   job). Hero "Find your next role at CivicWorks" plus the lede "{N} open
   positions. We hire on verified qualifications, not photocopies: apply with the
   diploma in your own wallet, share five fields only, and keep everything else
   private." A list of job cards: title, meta "{team} - {location} - {type} -
   {salary}", blurb, "Requires: {requirement}", tag chips, and an "Apply now" pill
   to `/showcase/civicworks/verify?job={slug}`. Give the first card's pill a
   gentle pulse.
2. **`/showcase/civicworks/verify?job={slug}` Job detail and application.** Two
   columns. Left: breadcrumb "All openings", title, meta, tags, and sections
   "About the role", "What you will do", "What we offer", "Requirements". Right:
   the application card with all states below.

### Application card states

- **Idle**: heading "Your application"; primary pill "Fill with your Wallet";
  helper "Your PID fills the details below; your diploma is attached as evidence.
  Or fill the form yourself and upload a PDF."; manual fields Full name, Email,
  Phone (optional), Message (optional); an "Evidence of qualification" section
  with an "Upload evidence PDF" button and note "{requirement}. Attach it from
  your wallet with the button above, or upload a PDF."; a "Submit application"
  pill.
- **Preparing**: the wallet pill reads "Preparing..." and is disabled.
- **Awaiting wallet**: the QR or same-device deep link, hint "Scan with the Wallet
  on your phone and share your PID and diploma. The PID fills your details; the
  diploma is your evidence."; a "Start again" refresh that mints a new exchange;
  and a "Cancel and fill the form myself" link.
- **Verified / filled**: prefill Full name from PID `given_name + family_name`
  (fallback the diploma `learnerName`) and Email from PID `email`; the evidence
  section becomes a clickable row "Diploma attestation from your wallet" with
  subtext "Verified: trusted issuer, valid signature, not revoked. Click to
  preview."
- **Rejected / failed** (answered but not verified, for example a revoked
  diploma): clear the QR, show "The credentials could not be verified. You can try
  again, or fill the form yourself and upload evidence." Keep the manual form
  usable.
- **Start error**: "Something went wrong." (log the real cause server-side).
- **PDF path**: the chosen file shows as an evidence row "Uploaded PDF. Click to
  preview."
- **Submit validation**: "Please give at least your name and email." /
  "Please attach evidence: fill with your wallet or upload a PDF."
- **Submitted (success)**: replace the card with a check icon, "Application
  submitted", and "Thank you for applying for {job.title}. We have received your
  application and our team will be in touch." This is local only; do not post the
  application anywhere.
- **Evidence drawer** (right-side panel, about 680px): for a PDF embed it; for the
  wallet evidence show an attestation card headed "National Diploma / Issued by
  the Ministry of Education" (issuer logo), a table of the five diploma claims
  with labels {learnerName "Name on diploma", qualificationName "Qualification",
  qualificationCode "Qualification code", awardingInstitution "Awarding
  institution", awardDate "Award date"}, a checks list (green tick / red cross),
  and the note "Shared from the candidate's wallet with selective disclosure; only
  the fields above were disclosed."

## The combined presentation (PID plus diploma, selective disclosure)

On "Fill with your Wallet", start ONE OpenID4VP request using the
"Diploma qualification check (rebuild)" presentation definition
(`DIPLOMA_PRESENTATION_DEFINITION_ID`), whose DCQL holds two credential queries
(skill `igrantio-dcql-query-diploma`):

- `id "pid"`, format `dc+sd-jwt`, `meta.vct_values ["urn:eu.europa.ec.eudi:pid:1"]`,
  claims `given_name, family_name, email`.
- `id "diploma"`, format `dc+sd-jwt`, `meta.vct_values ["urn:education:diploma:1"]`,
  claims `learnerName, qualificationName, qualificationCode, awardingInstitution,
  awardDate`.

The request carries no transaction data. Selective disclosure is enforced by the
diploma credential (all claims mandatory and `limitDisclosure: true`). After a
verified answer the PID prefills name and email and the diploma becomes the
attached evidence; nothing is auto-submitted.

## OWS calls (server-side, org civicworks) and status

- **Start** (server action): `POST /v3/config/digital-wallet/openid/sdjwt/
  verification/send` with `{ presentationDefinitionId:
  DIPLOMA_PRESENTATION_DEFINITION_ID, requestByReference: true }`. From
  `verificationHistory` return `{ exchangeId: presentationExchangeId, qrUri:
  vpTokenQrCode }`; if either is missing throw "The wallet service could not start
  the request." (QR by reference.)
- **Status route**: `GET /showcase/api/exchanges/{exchangeId}/status?org=
  civicworks&kind=presentation`. Allow-list the org/kind pair. Read `GET
  /v3/.../verification/history/{id}`; consider it answered when `verified === true`
  OR `vpTokenResponse` is a non-empty array OR `status === "presentation_acked"`;
  then return `{ events: [{ topic: "digitalwallet.presentation.verified", org }] }`,
  else `{ events: [] }`. On error return empty events. No webhooks, no SSE.
- **Read** (server action): `GET /v3/.../verification/history/{id}`; reduce to
  `{ exchangeId, status, verified, answered, claims, pid, checks }`. `claims`: the
  five diploma strings from `history.presentation`. `pid`: `{ givenName, familyName,
  email }`. `verified = history.verified === true`. Compute `revoked` from
  `history.presentationValidity[].revoked === true || revocationStatus ===
  "Revoked"`. `checks`: "Signature and integrity" (passed = verified); "Trusted
  issuer" (passed = verified, detail "Ministry of Education (trust list)");
  "Revocation status" (passed = verified and not revoked, detail "The credential
  has been revoked" or "Not revoked at verification time").

Poll the status route every 3000 ms, plus once on `visibilitychange`/`pageshow`.
Treat topics `digitalwallet.presentation.verified` and
`openid.presentation.presentation_acked.v3` as answered; on the first, call read,
then prefill on verified or show the rejection copy otherwise.

## Trust

The presentation definition is signed with the CivicWorks x509 verifier
certificate (`clientIdScheme x509_hash`, `trustAnchor x509`, `kid
DIPLOMA_CHECK_KID`), registered on the NXD WRPAC trust list, so the wallet shows
the request as trusted. The diploma issuer (Ministry of Education) is trusted via
the NXD Pub-EAA list, surfaced to the employer as the "Trusted issuer" check.

## Cross-portal rule (do not violate)

The employer reads nothing from any shared learner or application store or the
registry. Every displayed value comes from the wallet presentation via the OWS
verification history. Verify afresh from the wallet each time.

## What is real vs local

Real OWS: the send, the status poll, and the history read against the CivicWorks
sandbox key. Verification, selective disclosure, trust and revocation are genuine.
Local: the four jobs are static; there are no seeded applicants; the "Application
submitted" success is not posted anywhere. Optionally keep a browser-local,
hash-chained audit log with `verification.requested` (payload: the eight requested
claim paths) and `job.application_submitted`, actor role "candidate".

## Edge cases

Unknown or missing `job` param falls back to the first job. Same-device (coarse
pointer, small viewport) swaps the QR for a deep link. A revoked diploma yields
the rejection copy. A transient OWS or status error returns empty events and the
poller retries. "Start again" mints a new exchange. A wallet answer that is not
verified clears the QR and keeps the manual form usable.

## Acceptance checklist

1. The job board lists the four seeded roles; each "Apply now" opens the detail
   and application card.
2. "Fill with your Wallet" issues ONE OpenID4VP request (`requestByReference:
   true`) whose DCQL asks for PID {given_name, family_name, email} and diploma
   {learnerName, qualificationName, qualificationCode, awardingInstitution,
   awardDate}, and carries no transaction data.
3. The wallet shows exactly those 3 plus 5 fields for selective disclosure.
4. Status comes from polling the OWS verification history every 3s; no webhook or
   SSE.
5. On a verified answer the form prefills name and email from the PID, the diploma
   becomes the evidence, and the drawer shows the five claims plus the three trust
   checks.
6. A revoked or unverifiable diploma yields the rejection copy and no prefill.
7. The x509 verifier certificate is on the trust list and the diploma issuer is
   trusted.
8. Submitting shows the success card; nothing leaves the browser except the OWS
   verification calls.
