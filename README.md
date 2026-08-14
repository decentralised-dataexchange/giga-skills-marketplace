<h1 align="center">
    Giga Skills Marketplace
</h1>

<p align="center">
    <a href="/../../commits/" title="Last Commit"><img src="https://img.shields.io/github/last-commit/decentralised-dataexchange/ai-integrator?style=flat"></a>
    <a href="/../../issues" title="Open Issues"><img src="https://img.shields.io/github/issues/decentralised-dataexchange/ai-integrator?style=flat"></a>
    <a href="./LICENSE" title="License"><img src="https://img.shields.io/badge/License-Apache%202.0-yellowgreen?style=flat"></a>
</p>

A marketplace of provider-published, agent-agnostic skills for the education
wallet building block, with an app-store style review pipeline. The
repository holds three deployables:

- `services/marketplace/`: a Python 3.12 FastAPI service (managed with uv)
  that owns public catalogue reads.
- `web/`: a Next.js application with the public marketplace and the
  role-based provider and governance consoles.
- `showcases/education-showcase/`: the National Learner Registry and
  Education Wallet demonstration. See its
  [README](showcases/education-showcase/README.md) for its own development
  and deployment instructions.

PostgreSQL is the only datastore for the marketplace; it always runs in
Docker.

## Run locally for development

Prerequisites: Docker, Node.js 22 and [uv](https://docs.astral.sh/uv/). A
`Makefile` wraps the common routines; `make help` lists them.

Full stack in Docker:

```bash
make up          # postgres + marketplace + web
```

The web app is at http://localhost:4820 and the marketplace API at
http://localhost:4830 (`/health`, `/v1/skills`).

Hot-reload development runs Postgres in Docker and the two applications on
the host:

```bash
make db          # PostgreSQL in Docker (host port 5433)
make install     # dependencies for services/marketplace and web
make marketplace # terminal 1: marketplace service on :4830
make web         # terminal 2: web app on :4820
```

The schema bootstraps and demo data seeds on the first web API request.
`make check` runs every lint, format, type and test gate.

## Environment variables

Local defaults are wired into the Makefile and `docker-compose.yml`; nothing
needs to be set for a standard development run. No secret is committed to
the repository or passed through CI.

### Web application (`web/`)

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `MARKETPLACE_API_URL` | Base URL of the marketplace service |
| `GITHUB_TOKEN` | Optional; raises the GitHub API rate limit for repository submissions |
| `NEXT_PUBLIC_SHOWCASE_URL` | Optional; overrides the showcase link in the navigation (default `/showcase`) |

### Marketplace service (`services/marketplace/`)

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `PORT` | Listen port (default 4830) |
| `CORS_ORIGIN` | Allowed browser origin for the public API |
| `DB_MAX_CONNECTIONS` | Connection pool size |

## Production deployment

The Helm chart in [`deploy/helm/giga`](deploy/helm/giga) provisions the web
app, the marketplace service, PostgreSQL with a persistent volume, and an
nginx plus cert-manager ingress with TLS.

Prerequisites: a cluster with
[ingress-nginx](https://kubernetes.github.io/ingress-nginx/) and
[cert-manager](https://cert-manager.io/) (a `ClusterIssuer` such as
`letsencrypt-prod`), the `giga-web` and `giga-marketplace` images pushed to
a registry you control, and DNS pointed at the ingress load balancer.

The database password is blank in `values.yaml` on purpose. Create a local,
gitignored `deploy/helm/giga/values-secret.yaml`:

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

Override `domain`, `image.registry`, `ingress.className` and
`ingress.clusterIssuer` for your environment; everything else has sensible
defaults in `values.yaml`. See [`deploy/README.md`](deploy/README.md) for
details.

On every push to `main`, [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
builds the images and runs the same upgrade, authenticating to Google Cloud
with Workload Identity Federation. No long-lived keys. The education
showcase deploys from the same workflow once its cluster secret exists; see
its [README](showcases/education-showcase/README.md).

## Licensing

Copyright (c) 2026 LCubed AB (iGrant.io), Sweden

Licensed under the Apache 2.0 License, Version 2.0 (the "License"); you may
not use this file except in compliance with the License.

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
LICENSE for the governing limitations under the License.
