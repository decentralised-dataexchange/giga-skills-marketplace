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

A marketplace of provider-published, agent-agnostic **skills** and journey-tagged **use cases** for the education wallet building block. Wallet solution providers publish skill bundles (`SKILL.md` plus OpenAPI specs, credential schemas and rulebooks) and compose them into use cases. Every submission passes an app-store style pipeline of automated checks and human review. Anyone can install a skill or use case into their own AI coding agent (Claude Code, Codex, opencode, Cursor, Pi, and more) to build a working National Learner Registry and digital-credential solution. No vendor, model or tool lock-in.

## Architecture

The public catalog is separated from the web app by an HTTP API so the two can be deployed and scaled independently.

- **`services/marketplace/`** is a standalone Node service that owns public catalog reads, item details and the internal skill-context API.
- **`web/`** is a Next.js 16 app: the public marketplace and showcase, plus a role-based admin dashboard (provider, governance and developer consoles).
- **PostgreSQL** is the only datastore, via postgres.js. Both deployables accept `DATABASE_URL`. Postgres runs in Docker; there is no host install to manage.
- **UI** uses shadcn/ui and Tailwind with Manrope and Open Sans (Giga branding) and `streamdown` for markdown.

## Quick start

PostgreSQL always runs in Docker. A `Makefile` wraps the common routines; run `make help` to list them.

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
| `make check`                                 | `tsc --noEmit` plus `eslint` on the web app              |
| `make up` / `make down` / `make reset`       | Build/run, stop, or stop and wipe the Docker stack       |

Regression and capacity checks run against a started, seeded stack:

```bash
cd web && E2E_BASE_URL=http://localhost:4820 npm run test:e2e
LOAD_URL=http://localhost:4820/api/marketplace?pageSize=12 npm run test:load
```

The E2E suite covers catalog/detail rendering, both download formats, route-conflict regressions, authentication, authorization, and role APIs. The capacity gate sends 10,000 requests at 100 concurrent clients and requires zero errors with p95 latency below 500 ms.

## Deployment

Kubernetes deployment uses the Helm chart in [`deploy/helm/giga`](deploy/helm/giga). It provisions the web app, the marketplace service, PostgreSQL with a persistent volume, and an nginx plus cert-manager ingress with TLS.

Prerequisites: a cluster with [ingress-nginx](https://kubernetes.github.io/ingress-nginx/) and [cert-manager](https://cert-manager.io/) (a `ClusterIssuer` such as `letsencrypt-prod`), the `giga-web` and `giga-marketplace` images pushed to a registry you control, and DNS pointed at the ingress load balancer.

Secrets are blank in `values.yaml` on purpose. Create a local, gitignored `deploy/helm/giga/values-secret.yaml`:

```yaml
marketplace:
  internalToken: <random shared token>
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

- **Skill**: a provider capability, submitted as a `SKILL.md` bundle (plus `openapi/`, `schemas/`, `rulebooks/`, `examples/`), file by file or as a `.zip`.
- **Use case**: a journey-tagged prompt chain authored from a form in the Provider Console. It lists the prerequisites an app builder needs and one or more journeys, where each journey has agent prompts that each reference their own skills.
- **Application**: a developer showcase (title, description, demo video and the skills or use cases used), submitted from the Developer Console.

Skills and use cases can be endorsed **Official** by the marketplace operator; others show as **Community**. Each published item exposes an assurance review trail of automated checks and the approval audit.

## Roles

| Role                  | Can do                                                                                                                           |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `builder` (Developer) | Browse the marketplace, install skills and use cases into their own agent, submit application showcases                          |
| `provider`            | Everything a developer can, plus register an organisation and publish skills and use cases for review                            |
| `reviewer`            | Governance: claim the review queue, inspect bundles and check reports, approve, reject or request changes, moderate applications |
| `superadmin`          | Everything a reviewer can, plus verify organisations, manage users and roles, suspend accounts, endorse Official, delist         |

Governance roles are granted by a super admin and can never be self-assigned at registration.

Demo accounts (seeded on first run):

| Email                    | Password    | Role                                        |
| ------------------------ | ----------- | ------------------------------------------- |
| superadmin@govbuild.test | super123    | Super admin                                 |
| reviewer@govbuild.test   | review123   | Skill reviewer                              |
| provider@igrant.io       | provider123 | Approved provider (iGrant.io)               |
| trust@govstack.test      | provider123 | Approved provider (GovStack Trust Services) |
| labs@educhain.test       | provider123 | Provider with a pending organisation        |
| student@example.com      | student123  | Developer (student)                         |

## Contributing

Feel free to improve the project and send us a pull request. If you find any problems, please create an issue in this repo.

## Licensing

Copyright (c) 2026 LCubed AB (iGrant.io), Sweden

Licensed under the Apache 2.0 License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the LICENSE for the governing limitations under the License.
