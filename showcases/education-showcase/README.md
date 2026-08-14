# National Learner Registry and Education Wallet Showcase

A demonstration of the education wallet building block: a learner registers
with a PID from an EUDI Wallet, receives a Student ID and a diploma as
verifiable credentials, pays the diploma fee with a TS12 payment credential,
and applies for a job with selective disclosure. One Next.js application
serves the three portals (`/education`, `/school`, `/civicworks`), the
landing page (`/`) and the public registry audit trail (`/audit`).

## Run locally for development

Prerequisites: Node.js 20 or later, and an iGrant.io organisation account on
the target environment with a deployed Organisation Wallet.

```bash
cd showcases/education-showcase
cp .env.local.example .env.local   # then fill in the values (see below)
npm install
node scripts/provision.mjs         # one-off: creates OWS artefacts, registers webhooks
npm run dev
```

Wallet webhooks require a public HTTPS URL. Point `PUBLIC_BASE_URL` and
`BETTER_AUTH_URL` at a tunnel to your development port, for example:

```bash
cloudflared tunnel --url http://localhost:3000
```

`scripts/provision.mjs` is idempotent: it creates the credential and
presentation definitions, the signing keys and the webhooks on the iGrant.io
environment, and writes the created identifiers back into `.env.local`.
Re-running it skips anything that already exists.

To use the demo, load two credentials into one EUDI Wallet on a phone:

1. A PID: <https://igrant.io/demo/pid.html>
2. A TS12 payment credential: <https://igrant.io/demo/ts12-payment-credential-issuance.html>

## Environment variables

All values live in the gitignored `.env.local` during development and in the
cluster during production. No secret is ever committed to the repository or
passed through CI.

### iGrant.io Organisation Wallet Suite

| Variable                                                 | Purpose                                                    |
| -------------------------------------------------------- | ---------------------------------------------------------- |
| `IGRANT_BASE_URL`                                        | OWS base URL (demo: `https://demo-api.igrant.io`)          |
| `IGRANT_API_KEY`                                         | Main-tenant API key (Consent Building Block, provisioning) |
| `MOE_IGRANT_API_KEY`, `MOE_SANDBOX_ORG_ID`               | Ministry sandbox key and organisation id                   |
| `CIVICWORKS_IGRANT_API_KEY`, `CIVICWORKS_SANDBOX_ORG_ID` | Employer sandbox key and organisation id                   |
| `MOE_WEBHOOK_SECRET`, `CIVICWORKS_WEBHOOK_SECRET`        | Webhook HMAC secrets (any strong random value)             |

### Credential and presentation definitions

Created by `scripts/provision.mjs`; the identifiers are not secret.

| Variable                                                                        | Purpose                                       |
| ------------------------------------------------------------------------------- | --------------------------------------------- |
| `STUDENT_ID_CREDENTIAL_ID`, `DIPLOMA_CREDENTIAL_ID`                             | Credential definitions                        |
| `PID_PRESENTATION_DEFINITION_ID`                                                | PID sign-in presentation definition           |
| `PAYMENT_PRESENTATION_DEFINITION_ID`, `PAYMENT_CARD_PRESENTATION_DEFINITION_ID` | TS12 payment definitions (account and card)   |
| `DIPLOMA_PRESENTATION_DEFINITION_ID`                                            | Job application definition (PID plus diploma) |

### Consent Building Block

| Variable                                                                    | Purpose                         |
| --------------------------------------------------------------------------- | ------------------------------- |
| `CONSENT_BB_BASE_URL`                                                       | Consent Building Block base URL |
| `AGREEMENT_ENROLMENT_ID`, `AGREEMENT_ANALYTICS_ID`, `AGREEMENT_EMPLOYER_ID` | Data agreement identifiers      |

### Trust list (provisioning only)

| Variable                                         | Purpose                                      |
| ------------------------------------------------ | -------------------------------------------- |
| `TRUSTLIST_CLIENT_ID`, `TRUSTLIST_CLIENT_SECRET` | OAuth2 client for the NXD trust list backend |

### Application

| Variable                   | Purpose                                                                |
| -------------------------- | ---------------------------------------------------------------------- |
| `PUBLIC_BASE_URL`          | Public HTTPS URL of the app (webhooks, wallet links)                   |
| `BETTER_AUTH_URL`          | Public URL used for session cookies and trusted origins                |
| `BETTER_AUTH_SECRET`       | Session signing secret (generate with `openssl rand -base64 32`)       |
| `SQLITE_PATH`              | Database file (default `./sqlite.db`; `/data/app.db` in the container) |
| `LEARNER_PSEUDONYM_PEPPER` | Pepper for the pairwise learner pseudonym                              |
| `DEMO_STAFF_PASSWORD`      | Password for the seeded staff account                                  |
| `NEXT_PUBLIC_BASE_PATH`    | Deploy prefix, build-time (empty locally, `/showcase` in production)   |

## Production deployment

The Dockerfile builds a standalone Next.js server (node:20-alpine) with
SQLite on a mounted volume at `/data`. The deploy prefix is a build
argument:

```bash
docker build --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_BASE_PATH=/showcase \
  -t <registry>/education-showcase:<tag> .
docker push <registry>/education-showcase:<tag>
```

Secrets are created once, directly in the cluster, by an operator. The
script reads `.env.local`, generates a fresh production session secret and
applies the `education-showcase-secrets` secret:

```bash
./scripts/create-k8s-secret.sh   # optional argument: namespace
```

The Helm chart lives in `deploy/helm/education-showcase` at the repository
root: a single replica with a Recreate strategy (SQLite is single-writer), a
persistent volume claim, an nginx ingress on the shared domain under the
`/showcase` path, non-secret configuration in a ConfigMap and secrets from
`existingSecret`. Install or upgrade:

```bash
helm upgrade --install education-showcase ./deploy/helm/education-showcase \
  --namespace education-showcase --create-namespace \
  --set image.tag=<tag>
```

Override `domain`, `basePath`, `image.registry` and the `config` values in
`values.yaml` for your environment.

On every push to `main`, the repository deploy workflow builds the image and
rolls out the Helm changes. The workflow skips this application with a
notice until the cluster secret exists.
