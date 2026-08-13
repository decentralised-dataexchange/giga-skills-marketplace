<h1 align="center">
    Giga Skills Marketplace
</h1>

<p align="center">
    <a href="/../../commits/" title="Last Commit"><img src="https://img.shields.io/github/last-commit/decentralised-dataexchange/ai-integrator?style=flat"></a>
    <a href="/../../issues" title="Open Issues"><img src="https://img.shields.io/github/issues/decentralised-dataexchange/ai-integrator?style=flat"></a>
    <a href="./LICENSE" title="License"><img src="https://img.shields.io/badge/License-Apache%202.0-yellowgreen?style=flat"></a>
</p>

<p align="center">
  <a href="#about">About</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#quick-start">Quick start</a> •
  <a href="#deployment">Deployment</a> •
  <a href="#roles">Roles</a> •
  <a href="#contributing">Contributing</a> •
  <a href="#licensing">Licensing</a>
</p>

## About

A marketplace of provider-published, agent-agnostic **skills** for the education wallet building block. Wallet solution providers publish skills from their public GitHub repositories (`SKILL.md` plus OpenAPI specs, credential schemas and rulebooks). Every submission passes an app-store style pipeline of automated checks and human review. Anyone can install a skill into their own AI coding agent (Claude Code, Codex, opencode, Pi, and more) to build a working National Learner Registry and digital-credential solution. No vendor, model or tool lock-in.

## Architecture

The public catalog is separated from the web app by an HTTP API so the two can be deployed and scaled independently.

- **`services/marketplace/`** is a Python 3.12 FastAPI service, managed with uv, that owns public catalog reads and item details.
- **`web/`** is a Next.js 16 app: the public marketplace, plus a role-based admin dashboard (provider and governance consoles).
- **PostgreSQL** is the only datastore, via psycopg in the FastAPI service and postgres.js in the web app. Both deployables accept `DATABASE_URL`. Postgres runs in Docker; there is no host install to manage.
- **UI** uses shadcn/ui and Tailwind with self-hosted Inter (the iGrant.io site family), `lucide-react` for iconography, and `react-markdown` for markdown.

Every row is keyed by a UUID (`gen_random_uuid()`), so ids are opaque and non-enumerable wherever they appear. A database created before this carries SERIAL keys; the web app converts it in place on first boot, remapping foreign keys and the ids embedded in the audit log.

Catalog URLs name the provider that owns the item:

| Path                                              | Page                                   |
| ------------------------------------------------- | -------------------------------------- |
| `/`                                               | Catalog homepage (providers, search)   |
| `/knowledgebase`                                  | Documentation (how it works, concepts) |
| `/marketplace/<provider>`                         | Provider detail                        |
| `/marketplace/<provider>/<source>`                | One source repository's skills         |
| `/marketplace/<provider>/<source>/<skill>`        | Skill detail                           |
| `/marketplace/<provider>/<source>/<skill>/review` | Review trail                           |

`<provider>` is the organisation slug (its UUID also resolves); `<source>` is the GitHub repository name (as on skills.sh: `/<owner>/<repo>/<skill>`). Bare `/skill/<slug>` redirects to the canonical path, because a slug travels alone in an agent prompt, and bare `/marketplace` redirects to the homepage catalog.

Three surfaces were once built and then switched off behind a feature flag; they are now removed outright, along with the flag file itself:

| Removed                | Was                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Developer showcase     | The public gallery at `/showcase`, the Developer Console that submitted to it, and its governance moderation screen |
| Integration Assistant  | The AI app builder at `/builder`, its chat and share-link APIs, and its API-key section in Settings                 |
| `builder` account role | The "Developer" role at registration and in role assignment                                                         |

Their database tables (`chats`, `applications`) are no longer created, but an existing database keeps whatever rows it already holds; drop those tables yourself when you no longer want the data.

## Quick start

PostgreSQL always runs in Docker. Local development requires Node.js 22 and [uv](https://docs.astral.sh/uv/); a `Makefile` wraps the common routines, and `make help` lists them.

Full stack in Docker:

```bash
make up          # docker compose up --build (postgres + marketplace + web)
```

The web app is at http://localhost:4820 and the marketplace API at http://localhost:4830 (`/health`, `/v1/skills`).

Hot-reload development runs Postgres in Docker and the two apps on the host:

```bash
make db          # PostgreSQL in Docker (host port 5433)
make install     # install deps for services/marketplace and web
make marketplace # terminal 1: marketplace service on :4830
make web         # terminal 2: web app on :4820
```

The schema bootstraps and demo data seeds on the first web API request.

| Target                                       | Does                                                     |
| -------------------------------------------- | -------------------------------------------------------- |
| `make db` / `make db-stop` / `make db-reset` | Start, stop or wipe PostgreSQL in Docker                 |
| `make install`                               | Install deps for the marketplace service and the web app |
| `make marketplace` / `make web`              | Run the marketplace service (:4830) or web app (:4820)   |
| `make marketplace-check`                     | Ruff and pytest checks for the FastAPI service           |
| `make check`                                 | All marketplace, root, and web quality gates             |
| `make up` / `make down` / `make reset`       | Build/run, stop, or stop and wipe the Docker stack       |

Regression and capacity checks run against a started, seeded stack:

```bash
cd web && E2E_BASE_URL=http://localhost:4820 npm run test:e2e
LOAD_URL=http://localhost:4820/api/marketplace?pageSize=12 npm run test:load
```

The E2E suite covers catalog/detail rendering, provider-scoped URLs and their redirects, UUID id handling (including malformed ids answering 404 rather than erroring), a full submit-review-publish cycle, route-conflict regressions, authentication, authorization, role APIs, and that the removed surfaces answer 404 as pages and as APIs. The capacity gate sends 10,000 requests at 100 concurrent clients and requires zero errors with p95 latency below 500 ms.

## Deployment

Kubernetes deployment uses the Helm chart in [`deploy/helm/giga`](deploy/helm/giga). It provisions the web app, the marketplace service, PostgreSQL with a persistent volume, and an nginx plus cert-manager ingress with TLS.

Prerequisites: a cluster with [ingress-nginx](https://kubernetes.github.io/ingress-nginx/) and [cert-manager](https://cert-manager.io/) (a `ClusterIssuer` such as `letsencrypt-prod`), the `giga-web` and `giga-marketplace` images pushed to a registry you control, and DNS pointed at the ingress load balancer.

The database password is blank in `values.yaml` on purpose. Create a local, gitignored `deploy/helm/giga/values-secret.yaml`:

```yaml
postgres:
  password: <database password>
```

Install or upgrade:

```bash
helm upgrade --install giga ./deploy/helm/giga \
  -n giga --create-namespace \
  -f ./deploy/helm/giga/values-secret.yaml \
  --set domain=marketplace.example.org \
  --set image.registry=<your-registry> \
  --set image.tag=<tag>
```

Override `domain`, `image.registry`, `ingress.className` and `ingress.clusterIssuer` for your environment; everything else has sensible defaults in `values.yaml`. See [`deploy/README.md`](deploy/README.md) for details.

On every push to `main`, [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds both images and runs the same upgrade, authenticating to Google Cloud with Workload Identity Federation. No long-lived keys.

## Catalog

- **Skill**: a provider capability described by a `SKILL.md` (plus optional `openapi/`, `schemas/`, `rulebooks/`, `references/`). Skills are submitted by naming a **public GitHub repository**: every directory holding a `SKILL.md` becomes one skill, and the submission is pinned to a commit, tag, or branch head the provider chooses (default branch's latest commit otherwise). The marketplace fetches the repository server-side, so the stored files, stars, licence, and commit are marketplace-verified provenance.
  Updating a listing is resubmitting the repository at a new commit or tag; the new version goes through a fresh review while the published one stays live until it is superseded.

Reviewers see the source repository (pinned deep link, stars, forks, licence, last push) alongside the automated check report.

Published skills install straight from their source with the [skills CLI](https://github.com/vercel-labs/skills): `npx skills add <owner>/<repo>` for a whole repository, or `npx skills add https://github.com/<owner>/<repo> --skill <name>` for one skill. Set the optional `GITHUB_TOKEN` env var on the web app to raise GitHub's API rate limit (60 requests/hour per IP unauthenticated; a submission or inspection costs 3 API calls).

Each published item exposes an assurance review trail of automated checks and the approval audit.

## Roles

| Role         | Can do                                                                                                         |
| ------------ | -------------------------------------------------------------------------------------------------------------- |
| `provider`   | Register an organisation (instant, no approval step) and publish skills for review; the only self-service role |
| `reviewer`   | Governance: claim the review queue, inspect bundles and check reports, approve, reject or request changes      |
| `superadmin` | Everything a reviewer can, plus manage organisations, users and roles, suspend accounts, delist                |

Governance roles are granted by a super admin and can never be self-assigned at registration.

Demo accounts (seeded on first run):

| Email                    | Password    | Role                          |
| ------------------------ | ----------- | ----------------------------- |
| superadmin@govbuild.test | super123    | Super admin                   |
| reviewer@govbuild.test   | review123   | Skill reviewer                |
| provider@igrant.io       | provider123 | Approved provider (iGrant.io) |
| labs@educhain.test       | provider123 | Provider (EduChain Labs)      |

## Contributing

Feel free to improve the project and send us a pull request. If you find any problems, please create an issue in this repo.

## Licensing

Copyright (c) 2026 LCubed AB (iGrant.io), Sweden

Licensed under the Apache 2.0 License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the LICENSE for the governing limitations under the License.
