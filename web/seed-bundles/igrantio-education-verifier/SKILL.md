---
name: igrantio-verifier
description: >
  Verify credentials presented by a learner wallet using the
  iGrant.io Verifier API over OpenID4VP with DCQL. Use when a relying
  party (employer, university, agency) must check authenticity,
  integrity, issuer signature, and revocation status.
version: 1.0.0
provider: iGrant.io (LCubed AB)
targets:
  api: https://docs.igrant.io/docs/developer-apis
  openapi: ./openapi/verifier.yaml
  protocols: [OpenID4VP-1.0, DCQL, SD-JWT-VC]
depends_on:
  schemas: [./schemas/presentation-request.schema.json]
  rulebooks: [./rulebooks/trust-rules.md]
auth: API key (X-API-Key header); use the sandbox base URL for development
license: Apache-2.0
---

# Verify a credential (iGrant.io Verifier API)

## When to use
Use this skill when a relying party application must request and verify a
verifiable presentation from a learner's wallet.

## Steps
1. Build a DCQL query asking only for the claims the relying party needs
   (data minimisation - see rulebooks/trust-rules.md).
2. Create a presentation request: POST /verifier/presentation-requests.
   Show the returned QR code / deep link to the learner.
3. Poll GET /verifier/presentation-requests/{id} (or use the webhook)
   until the learner responds.
4. Check the verification result object: authenticity, integrity,
   issuerSignature, revocationStatus must ALL be valid before accepting.
5. Log the verification outcome with the consent reference.

## Validation / done criteria
- A tampered or revoked credential is rejected with a clear reason.
- Only the DCQL-requested claims are disclosed.
