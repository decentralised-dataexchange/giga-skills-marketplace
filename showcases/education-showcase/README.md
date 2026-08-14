# National Learner Registry & Education Wallet Showcase

A working demonstration of the ITU/Giga education use case: a learner registers
in a National Learner Registry with a PID from an EUDI Wallet, receives a
Student ID and a diploma as verifiable credentials, pays the diploma fee with a
TS12 payment credential, and applies for a job with selective disclosure.
Revocation closes the trust loop.

One Next.js application serves five portals under one domain, each styled as
its own product:

| Path | Portal | Who |
| --- | --- | --- |
| `/education` | National Education Portal | Learner (wallet sign-in only) |
| `/school` | Riverside Secondary School, Admissions | School officer |
| `/moe` | Ministry of Education, Registrar Back Office | Registrar |
| `/dpa` | Data Protection Authority, Consent Oversight | Privacy supervisor |
| `/civicworks` | CivicWorks Careers (job board) | Candidate (public) |

The landing page (`/`) carries the demo script, the prerequisites and a
one-click demo data reset.

## What is real

- PID sign-in, credential issuance and verification run against the
  [iGrant.io Organisation Wallet Suite](https://docs.igrant.io/docs/developer-apis)
  over OpenID4VCI and OpenID4VP 1.0 (SD-JWT VC, DCQL, selective disclosure,
  revocation), with x509 trust anchors and per-definition certificates
  registered on the NXD trust lists.
- The diploma fee is a dynamic credential request: the wallet presents a TS12
  payment credential (account or card) with the transaction data, and the
  diploma issues in the same session.
- Consent runs against the iGrant.io Consent Building Block: a public-task
  processing notice plus two optional, withdrawable agreements, and a
  right-to-be-forgotten procedure in the DPA portal.
- Registries, civil-registry checks, the payment ledger and the institution
  signature are prototype or sandbox representations, labelled as such in the
  UI.

## Prerequisites

Load two credentials into one EUDI Wallet on your phone:

1. A PID: <https://igrant.io/demo/pid.html>
2. A TS12 payment credential: <https://igrant.io/demo/ts12-payment-credential-issuance.html>

## Run locally

```bash
cd showcases/education-showcase
cp .env.local.example .env.local   # then fill in the values
npm install
npm run dev
```

Wallet webhooks need a public HTTPS URL: point `PUBLIC_BASE_URL` at a tunnel
(for example `cloudflared tunnel --url http://localhost:3000`) and run
`node scripts/provision.mjs` once to create the OWS artefacts and register the
webhooks. The script is idempotent and writes created ids back into
`.env.local`.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `IGRANT_BASE_URL` | OWS base URL (demo: `https://demo-api.igrant.io`) |
| `IGRANT_API_KEY` | Main-tenant key (Consent BB, provisioning) |
| `MOE_IGRANT_API_KEY`, `MOE_SANDBOX_ORG_ID` | Ministry sandbox key and id |
| `CIVICWORKS_IGRANT_API_KEY`, `CIVICWORKS_SANDBOX_ORG_ID` | Employer sandbox key and id |
| `MOE_WEBHOOK_SECRET`, `CIVICWORKS_WEBHOOK_SECRET` | Webhook HMAC secrets |
| `STUDENT_ID_CREDENTIAL_ID`, `DIPLOMA_CREDENTIAL_ID` | Credential definitions |
| `PID_PRESENTATION_DEFINITION_ID` | PID sign-in presentation definition |
| `PAYMENT_PRESENTATION_DEFINITION_ID`, `PAYMENT_CARD_PRESENTATION_DEFINITION_ID` | TS12 payment definitions |
| `DIPLOMA_PRESENTATION_DEFINITION_ID` | Job application definition (PID + diploma) |
| `CONSENT_BB_BASE_URL`, `AGREEMENT_*_ID` | Consent Building Block |
| `PUBLIC_BASE_URL`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET` | App base URL and session signing |
| `SQLITE_PATH` | Database file (default `./sqlite.db`; `/data/app.db` in the container) |
| `LEARNER_PSEUDONYM_PEPPER` | Pepper for the pairwise learner pseudonym |

Secrets stay in the gitignored `.env.local` locally and in the cluster secret
in production; they never enter the repository.

## Deployment

The Dockerfile builds a standalone Next.js server (node:20-alpine, SQLite on a
mounted volume at `/data`). The Helm chart lives in
`deploy/helm/education-showcase`: one replica with a Recreate strategy (SQLite
is single-writer), a PersistentVolumeClaim, an nginx ingress with cert-manager
TLS and non-secret configuration in a ConfigMap.

Sensitive values never pass through the repository or CI. An operator creates
the cluster secret once, directly in the cluster:

```bash
./scripts/create-k8s-secret.sh   # reads .env.local, applies education-showcase-secrets
```

The repository deploy workflow then only builds the image and rolls out Helm
changes; it skips the showcase with a notice until that secret exists.

## Data model notes

- The learner identifier is `ULID-` plus 16 Crockford Base32 characters,
  generated at registrar approval.
- The registry stores no PID attribute: the learner is keyed by a pairwise
  pseudonym (HMAC of stable PID claims with a server pepper), and form
  prefill values are transient.
- The audit log is append-only (SQLite triggers) and hash-chained; the
  Ministry portal verifies the chain on every view.
- The Student ID follows the registry `VerifiableStudentID` claim set. The
  diploma models W3C VC 2.0 / Open Badges education fields semantically and
  is carried as an SD-JWT VC for selective disclosure; the two are related
  but distinct standards, and the credential format is the latter.
