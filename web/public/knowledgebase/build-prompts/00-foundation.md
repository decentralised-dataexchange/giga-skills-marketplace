# Per-portal build prompts

Extremely detailed, code-accurate prompts to rebuild the education showcase one
portal at a time with an AI coding agent and the skills from the ITU Skills
Marketplace. Each prompt is grounded in the running showcase
(`web/app/showcase`, `web/lib/showcase`, `web/scripts/showcase-provision.mjs`).

The showcase is three portals on one Next.js origin, so they share one browser
store:

1. National Education Portal - the learner. Sign in with a PID, receive a Student
   ID, then receive a diploma after paying the fee by account or card.
2. Riverside Admissions - the school. Review the enrolment queue, enrol a learner
   (issues the Student ID), and sign the graduation decision that leads to the
   diploma.
3. CivicWorks Careers - the employer. Apply with your wallet: one combined request
   for PID identity plus the diploma qualification, with selective disclosure.

Give the shared foundation below once. Then give one portal prompt per build
segment. The definitions and keys are created once; each portal assumes they
exist.

---

## Prerequisites (state these in the video)

Two things gate the whole build:

1. **API keys.** One OWS API key per sandbox organisation. The Ministry of
   Education (MoE) is the issuer and the sign-in and payment verifier; CivicWorks
   is the qualification verifier. The Consent Building Block runs on a third,
   main-tenant key. Every key stays on the server; the browser never sees one.
2. **Trust list registrations.** One x509 certificate per definition on the trust
   list. Put the issuer certificates (Student ID, diploma) on the NXD Pub-EAA
   list and the verifier certificates (sign-in, payment, employer) on the NXD
   WRPAC list. Until a certificate answers `granted`, the wallet shows an
   untrusted service provider warning. There are five signing keys for six
   definitions: the account and card payment definitions share the payment key.

Also needed off camera: an OWS tenant with sandbox creation, an AI coding agent
and a model, the iGrant.io Data Wallet on a phone with a PID and a TS12 payment
credential, and a clean working directory.

## Skills to load for the shared foundation

- `igrantio-ows-overview` (architecture, endpoints, glossary; read first)
- `igrantio-api-sandboxes`, `igrantio-api-api-keys` (sandbox orgs and scoped keys)
- `igrantio-api-key-management`, `igrantio-trustlist-entries`,
  `igrantio-api-trust-anchor` (signing keys, certificates, trust lists)
- `igrantio-credential-schema-student-id`, `igrantio-credential-schema-diploma`,
  `igrantio-credential-schema-pid`, `igrantio-credential-schema-sca-payment-account`
  (and its card counterpart) for the credential claim sets
- `igrantio-dcql-query-pid`, `igrantio-dcql-query-sca-payment-account`,
  `igrantio-dcql-query-sca-payment-card`, `igrantio-dcql-query-diploma` for the
  presentation queries
- `igrantio-issuer-backend`, `igrantio-verifier-backend`, `igrantio-qr-code`,
  `igrantio-individuals`, `igrantio-consent-records`, `igrantio-usecase-ui`,
  `igrantio-frontend-client` for the backends and UI

To install exactly this set: open the skills repository in the marketplace,
filter by the `education` category, select all, and copy the one install command.

## The golden rule on live status

Live wallet status is read by **polling the OWS exchange record, not by webhooks
and not by SSE**. OWS makes exactly one webhook delivery attempt with no retry,
so the showcase polls a small status route every 3000 ms (and once more on
`visibilitychange`/`pageshow`, to catch the return from the wallet app on the
same device). The route reads the OWS credential or verification history and
returns the update in the webhook topic vocabulary, so the client reads one
language. No webhook receiver, no HMAC, no relay storage is provisioned.

## Provision once: the six definitions (fresh labels, identical fields)

Use new, unique labels ending " (rebuild)" so nothing deployed breaks. Keep the
credential types (vct), formats, claims and flags identical. The provisioning
script must be idempotent: search by label first, reuse if found, else create,
and write each id back to the environment.

Create these under the **MoE** sandbox (`MOE_IGRANT_API_KEY`):

Presentation definitions
(`POST /v2/config/digital-wallet/openid/sdjwt/presentation-definition`), all
`version_01`, `responseType vp_token`, `responseMode direct_post`,
`clientIdScheme x509_hash`, `trustAnchor x509`:

| Label (rebuild) | kid | DCQL id | vct | Claims | Transaction data |
| --- | --- | --- | --- | --- | --- |
| Learner PID sign-in (rebuild) | `PID_VERIFY_KID` | `pid-login` | `urn:eu.europa.ec.eudi:pid:1` | `given_name, family_name, birthdate, email, address` | none |
| Diploma fee payment confirmation (rebuild) | `PAYMENT_VERIFY_KID` | `payment-account` | `https://oid4vc.igrant.io/service/vct-metadata/payment_account` | `iban, bic, currency` | `payment` |
| Diploma fee payment confirmation (card) (rebuild) | `PAYMENT_VERIFY_KID` | `payment-card` | `https://oid4vc.igrant.io/service/vct-metadata/card` | `pan_last_four, scheme, scheme_logo` | `payment` |

Credential definitions
(`POST /v2/config/digital-wallet/openid/sdjwt/credential-definition`), format
`dc+sd-jwt`, `validationPath "$"`, all claims mandatory and `limitDisclosure:
true`:

| Label (rebuild) | kid | vct | Claims | Flags | Display |
| --- | --- | --- | --- | --- | --- |
| Verifiable Student ID (rebuild) | `STUDENT_ID_KID` | `VerifiableStudentID` | 16 registry claims (see the learner prompt) | `supportRevocation`, `expirationInDays 1825` | name "Student ID", bg `#232f56` |
| National Diploma (rebuild) | `DIPLOMA_KID` | `urn:education:diploma:1` | `learnerName, qualificationName, qualificationCode, awardingInstitution, awardDate, programme, result, ulid, graduationDecisionHash` | `supportRevocation`, `supportInteractiveAuthorisationEndpoint: true`, `expirationInDays 3650` | name "Diploma", bg `#1d4e89` |

Create this under the **CivicWorks** sandbox (`CIVICWORKS_IGRANT_API_KEY`):

| Label (rebuild) | kid | DCQL | Transaction data |
| --- | --- | --- | --- |
| Diploma qualification check (rebuild) | `DIPLOMA_CHECK_KID` | two queries: `pid` (`given_name, family_name, email`) + `diploma` (`learnerName, qualificationName, qualificationCode, awardingInstitution, awardDate`) | none |

## Environment variables

`IGRANT_BASE_URL` (default `https://demo-api.igrant.io`), `MOE_IGRANT_API_KEY`,
`CIVICWORKS_IGRANT_API_KEY`, `IGRANT_API_KEY` (Consent BB),
`LEARNER_PSEUDONYM_PEPPER`; the ids written by provisioning
(`PID_PRESENTATION_DEFINITION_ID`, `PAYMENT_PRESENTATION_DEFINITION_ID`,
`PAYMENT_CARD_PRESENTATION_DEFINITION_ID`, `DIPLOMA_PRESENTATION_DEFINITION_ID`,
`STUDENT_ID_CREDENTIAL_ID`, `DIPLOMA_CREDENTIAL_ID`); the consent agreement ids
(`AGREEMENT_ENROLMENT_ID`, `AGREEMENT_ANALYTICS_ID`, `AGREEMENT_EMPLOYER_ID`);
and the optional signing key ids (`PID_VERIFY_KID`, `PAYMENT_VERIFY_KID`,
`STUDENT_ID_KID`, `DIPLOMA_KID`, `DIPLOMA_CHECK_KID`).

## Shared conventions for every portal

- **Stack.** Next.js App Router, TypeScript, React client components. All OWS and
  Consent calls run in server actions or route handlers; the browser never sees a
  key or the base URL. The OWS client injects `Authorization: ApiKey <key>` and
  `cache: "no-store"`, maps org to key (`moe`, `civicworks`, `main`), and never
  surfaces raw OWS errors.
- **Demo state.** One browser `localStorage` store, namespace `itu.showcase.*`,
  a `version` key that wipes the namespace on mismatch (the demo reset). Keys:
  `session.learner`, `session.school`, `learner`, `applications`, `exchanges`,
  `audit`. Read it reactively; sync across tabs on the `storage` event; guards
  wait for hydration before redirecting. Sessions are fake; the server holds no
  user state.
- **Audit.** An append-only, SHA-256 hash-chained audit log in the browser.
- **QR.** By reference for presentations; a same-device deep link replaces the QR
  on a coarse-pointer narrow screen; the requesting portal's logo is excavated in
  the QR centre.
- **Application state machine.** `submitted -> approved -> graduation_submitted
  -> payment_pending -> issued`. Intermediate states are momentary because
  registry processing runs automatically in the browser.
- **Registry identifiers.** ULID = `ULID-` + 16 Crockford Base32 chars. Learner
  pseudonym = `HMAC-SHA256(LEARNER_PSEUDONYM_PEPPER, given_name|family_name|
  birthdate)`; the pepper never leaves the server and no raw PID is stored.
  `graduationDecisionHash` = `sha256(decisionText)`, clamped to 64 chars.

## Using these prompts for the video

Record the install and the first product prompt live. Show each prompt as a
large card, then cut to the result in the browser or the OWS dashboard.
Speed-ramp the long agent runs and cut retries. The credential and DCQL fields
above are the exact ones from `web/scripts/showcase-provision.mjs`; only the
labels and env-var names change for a clean parallel rebuild.
