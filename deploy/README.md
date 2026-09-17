# Deploying the ITU Skills Marketplace

Kubernetes deployment via the Helm chart in [`helm/giga`](helm/giga). It provisions:

- **giga-web**: the Next.js marketplace, dashboard, and public catalog API (Service on port 80 → 4820)
- **giga-postgres**: PostgreSQL 16 with a PersistentVolumeClaim
- **Ingress**: nginx + cert-manager TLS for your domain

## Prerequisites

- A Kubernetes cluster with [ingress-nginx](https://kubernetes.github.io/ingress-nginx/) and [cert-manager](https://cert-manager.io/) (with a `ClusterIssuer`, e.g. `letsencrypt-prod`)
- The `giga-web` container image built from the repository Dockerfile and pushed to a registry you control
- DNS for your domain pointed at the ingress load balancer

## Configure your environment

The defaults in [`helm/giga/values.yaml`](helm/giga/values.yaml) are neutral
placeholders. Two values files sit on top of them:

1. **An environment values file** (non-secret, safe to commit). Set at least
   `domain`, `image.registry` and `ingress.tlsSecret`. The maintainers'
   staging preset, [`helm/giga/values-staging.yaml`](helm/giga/values-staging.yaml),
   is a complete worked example — copy it and replace every value. For a
   real production deployment also set:

   ```yaml
   mode: production # no demo data, no demo accounts on the sign-in page
   superadmin:
     email: operator@example.org
     name: Marketplace Operator
   ```

2. **A secret values file** (gitignored). `values.yaml` ships with the
   database password and the super admin password blank on purpose; provide
   them at deploy time. Create a local `values-secret.yaml`:

   ```yaml
   postgres:
     password: <database-password>
   superadmin:
     password: <super-admin-password> # at least 12 characters
   ```

   The chart refuses to render in production mode without
   `superadmin.email` and `superadmin.password`.

## Demo and production mode

`mode` becomes the web app's `MARKETPLACE_MODE`, read at runtime, so the same
image serves both kinds of deployment. It is the starting value: a super
admin can switch demo mode (and self-service registration) on or off
afterwards under Dashboard → Settings, and the stored setting then wins.

| Mode                 | Demo data                                                   | Sign-in page                                  | Super admin                                                                           |
| -------------------- | ----------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------- |
| `demo` (default)     | Seeded on the first boot (demo accounts, organisations, skills) | Offers "Use a demo account"                   | The seeded `superadmin@govbuild.test`; `superadmin.*` optional                        |
| `production`         | None                                                        | No demo accounts, none sent to the browser    | `superadmin.email` + `superadmin.password`, required                                  |

The web app bootstraps the `superadmin.*` account on every boot: it is
created when missing, and its password, role and status follow the values.
To rotate the password, change `superadmin.password` in `values-secret.yaml`
and upgrade; the pods restart and apply it. In production mode the app
refuses to serve while no super admin exists, since only a super admin can
grant governance roles.

## Install / upgrade

```bash
helm upgrade --install giga ./deploy/helm/giga \
  -n giga --create-namespace \
  -f ./my-values.yaml \
  -f ./values-secret.yaml \
  --set image.tag=<image-tag>
```

Everything not set in your values files has sensible defaults in `values.yaml`.

## Education showcase (optional)

The showcase under `/showcase` deploys disabled by default: every page
renders, and only the wallet broker calls fail with a safe error. To enable
the real wallet flows:

1. Run `node web/scripts/showcase-provision.mjs` once to create the
   credential and presentation definitions, and put the resulting ids in
   the `showcase.config` block of your environment values file (see
   `values-staging.yaml` for the shape). These ids are not secret.
2. Run [`create-showcase-secret.sh`](create-showcase-secret.sh) once per
   cluster to create the `giga-showcase-secrets` secret from your
   `web/.env.local` (OWS API keys, pseudonym pepper). These secrets never
   pass through the chart or CI; the web deployment mounts the secret as
   optional env.

## Production capacity

The chart starts two web replicas and enables CPU-based horizontal autoscaling (web 2–6). A metrics server must be installed for the HPA to work. Pod disruption budgets retain at least one replica during voluntary disruptions, and per-pod database pools are capped so maximum scale does not exhaust PostgreSQL connections.

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

## CI/CD (maintainers)

[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) builds the
web image and runs the same `helm upgrade` with `values-staging.yaml` on every
push to `main`, authenticating to GCP with Workload Identity Federation (no
long-lived keys). Secrets come from the repository's GitHub Actions secrets,
not from git. Forks do not run this workflow: it targets the maintainers'
cluster and needs their federation trust and secrets.
