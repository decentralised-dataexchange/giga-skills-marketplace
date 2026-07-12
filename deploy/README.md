# Deploying the Giga Skills Marketplace

Kubernetes deployment via the Helm chart in [`helm/giga`](helm/giga). It provisions:

- **giga-web** — the Next.js marketplace/dashboard (Service on port 80 → 4820)
- **giga-marketplace** — the internal Node API (Service on port 4830)
- **giga-postgres** — PostgreSQL 16 with a PersistentVolumeClaim
- **Ingress** — nginx + cert-manager TLS for your domain

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

## CI/CD

`.github/workflows/deploy.yml` builds both images and runs the same `helm upgrade` on every push to `main`, authenticating to GCP with Workload Identity Federation (no long-lived keys). Secrets come from the repo's GitHub Actions secrets, not from git.
