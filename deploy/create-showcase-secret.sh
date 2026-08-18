#!/usr/bin/env bash
# Create or update the showcase cluster secret directly in the cluster, from
# the values in web/.env.local. Sensitive values never enter the repository
# or CI: run this once per cluster (and again after a rotation). The web
# deployment mounts the secret as optional env, so the site deploys fine
# before this has run - only the showcase wallet flows need it.
#
# Usage: ./deploy/create-showcase-secret.sh [namespace]
set -euo pipefail

NAMESPACE="${1:-giga}"
ENV_FILE="$(dirname "$0")/../web/.env.local"

if [ ! -f "$ENV_FILE" ]; then
  echo "No web/.env.local found." >&2
  exit 1
fi

get() { grep "^$1=" "$ENV_FILE" | head -1 | cut -d= -f2-; }

for name in IGRANT_API_KEY MOE_IGRANT_API_KEY CIVICWORKS_IGRANT_API_KEY \
  LEARNER_PSEUDONYM_PEPPER; do
  if [ -z "$(get "$name")" ]; then
    echo "$name is empty in web/.env.local" >&2
    exit 1
  fi
done

kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

kubectl -n "$NAMESPACE" create secret generic giga-showcase-secrets \
  --from-literal=IGRANT_API_KEY="$(get IGRANT_API_KEY)" \
  --from-literal=MOE_IGRANT_API_KEY="$(get MOE_IGRANT_API_KEY)" \
  --from-literal=CIVICWORKS_IGRANT_API_KEY="$(get CIVICWORKS_IGRANT_API_KEY)" \
  --from-literal=LEARNER_PSEUDONYM_PEPPER="$(get LEARNER_PSEUDONYM_PEPPER)" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "Secret giga-showcase-secrets applied in namespace $NAMESPACE."
