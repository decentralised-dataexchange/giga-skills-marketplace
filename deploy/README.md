# Deploying the Giga Skills Marketplace

Kubernetes deployment via the Helm chart in [`helm/giga`](helm/giga). It provisions:

- **giga-web**: the Next.js marketplace/dashboard (Service on port 80 → 4820)
- **giga-marketplace**: the internal Node API (Service on port 4830)
- **giga-postgres**: PostgreSQL 16 with a PersistentVolumeClaim
- **Ingress**: nginx + cert-manager TLS for your domain

## Prerequisites

- A Kubernetes cluster with [ingress-nginx](https://kubernetes.github.io/ingress-nginx/) and [cert-manager](https://cert-manager.io/) (with a `ClusterIssuer`, e.g. `letsencrypt-prod`)
- Container images `giga-web` and `giga-marketplace` pushed to a registry you control (see `docker-compose.yml` / repo Dockerfiles to build them)
- DNS for your domain pointed at the ingress load balancer

## Configure secrets

`values.yaml` ships with the two secrets blank on purpose. Provide them at deploy time. Create a local, gitignored `values-secret.yaml`:

```yaml
marketplace:
  internalToken: <random-shared-token>
postgres:
  password: <database-password>
```

## Install / upgrade

```bash
helm upgrade --install giga ./deploy/helm/giga \
  -n giga --create-namespace \
  -f ./deploy/helm/giga/values-secret.yaml \
  --set domain=marketplace.example.org \
  --set image.registry=<your-registry> \
  --set image.tag=<image-tag>
```

Override `domain`, `image.registry`, `ingress.className`, and `ingress.clusterIssuer` for your environment. Everything else has sensible defaults in `values.yaml`.

## Production capacity

The chart starts two web and two marketplace replicas and enables CPU-based horizontal autoscaling (web 2–6, marketplace 2–4). A metrics server must be installed for the HPAs to work. Pod disruption budgets retain at least one replica during voluntary disruptions, and per-pod database pools are capped so maximum scale does not exhaust PostgreSQL connections.

The bundled PostgreSQL pod is a single-node convenience for demos and is not highly available. For a production deployment serving 10,000 accounts, use managed PostgreSQL with backups, monitoring, and connection capacity for at least 80 application connections. Put the connection URL only in `values-secret.yaml`:

```yaml
postgres:
  enabled: false
  externalDatabaseUrl: postgresql://user:password@managed-host:5432/govbuild?sslmode=require
  password: "" # not needed with externalDatabaseUrl
```

The repository capacity gate models 10,000 catalog requests at 100 concurrent clients. Run it against a production build in an isolated environment:

```bash
LOAD_URL=https://staging.example.org/api/marketplace?pageSize=12 npm run test:load
```

It fails on any HTTP/network error or p95 latency above 500 ms. This baseline represents 10,000 registered users under a catalog-heavy workload, not 10,000 simultaneous active connections; validate a production-like cluster and managed database before changing that concurrency assumption.

## CI/CD

`.github/workflows/deploy.yml` builds both images and runs the same `helm upgrade` on every push to `main`, authenticating to GCP with Workload Identity Federation (no long-lived keys). Secrets come from the repo's GitHub Actions secrets, not from git.
