#!/usr/bin/env bash
# Create or update the education showcase cluster secret directly in the
# cluster, from the values in .env.local. Sensitive values never enter the
# repository or CI: run this once per cluster (and again after a rotation).
#
# Usage: ./scripts/create-k8s-secret.sh [namespace]
set -euo pipefail

NAMESPACE="${1:-education-showcase}"
ENV_FILE="$(dirname "$0")/../.env.local"

if [ ! -f "$ENV_FILE" ]; then
  echo "No .env.local found next to this script's parent directory." >&2
  exit 1
fi

get() { grep "^$1=" "$ENV_FILE" | head -1 | cut -d= -f2-; }

for name in IGRANT_API_KEY MOE_IGRANT_API_KEY CIVICWORKS_IGRANT_API_KEY \
  MOE_WEBHOOK_SECRET CIVICWORKS_WEBHOOK_SECRET LEARNER_PSEUDONYM_PEPPER; do
  if [ -z "$(get "$name")" ]; then
    echo "$name is empty in .env.local" >&2
    exit 1
  fi
done

# The production session secret is generated fresh here, not copied from the
# development file.
BETTER_AUTH_SECRET_VALUE="$(openssl rand -base64 32)"

kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

kubectl -n "$NAMESPACE" create secret generic education-showcase-secrets \
  --from-literal=IGRANT_API_KEY="$(get IGRANT_API_KEY)" \
  --from-literal=MOE_IGRANT_API_KEY="$(get MOE_IGRANT_API_KEY)" \
  --from-literal=CIVICWORKS_IGRANT_API_KEY="$(get CIVICWORKS_IGRANT_API_KEY)" \
  --from-literal=MOE_WEBHOOK_SECRET="$(get MOE_WEBHOOK_SECRET)" \
  --from-literal=CIVICWORKS_WEBHOOK_SECRET="$(get CIVICWORKS_WEBHOOK_SECRET)" \
  --from-literal=BETTER_AUTH_SECRET="$BETTER_AUTH_SECRET_VALUE" \
  --from-literal=LEARNER_PSEUDONYM_PEPPER="$(get LEARNER_PSEUDONYM_PEPPER)" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "Secret education-showcase-secrets applied in namespace $NAMESPACE."
