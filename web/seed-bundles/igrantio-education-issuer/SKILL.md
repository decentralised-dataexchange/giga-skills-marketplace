---
name: igrantio-education-issuer
description: >
  Integrate education credential issuance (diploma, transcript,
  micro-credential) against the iGrant.io Issuer API using OpenID4VCI.
  Use when an application must issue W3C Verifiable Credentials to a
  learner's wallet.
version: 1.0.0
provider: iGrant.io (LCubed AB)
targets:
  api: https://docs.igrant.io/docs/developer-apis
  openapi: ./openapi/issuer.yaml
  protocols: [OpenID4VCI-1.0, W3C-VC-2.0, SD-JWT-VC]
depends_on:
  schemas: [./schemas/diploma.schema.json, ./schemas/transcript.schema.json, ./schemas/learner-profile.schema.json]
  rulebooks: [./rulebooks/qualification-rules.md]
auth: API key (X-API-Key header); use the sandbox base URL for development
license: Apache-2.0
---

# Issue an education credential (iGrant.io Issuer API)

## When to use
Use this skill when the application must issue a signed education credential
to a learner's wallet and register it for later verification.

## Prerequisites
1. Obtain an API key and the sandbox base URL (see the provider's
   "Get Started with APIs").
2. Confirm the learner has a ULID in the National Learner Registry.

## Steps
1. Validate the issuance request against schemas/diploma.schema.json
   and the rules in rulebooks/qualification-rules.md.
2. Create a credential offer: POST /issuer/credential-offer
   (see openapi/issuer.yaml) with the learner DID, credential type,
   and claims.
3. Return the offer to the wallet to start the OpenID4VCI flow; the
   wallet completes the token and credential-request steps.
4. On the issuance webhook callback, record the credential in the
   Certificate Registry.

## Validation / done criteria
- The credential verifies against the Verifier API.
- Selective disclosure (SD-JWT VC) returns only the requested claims.
- Every call and its review are logged for audit.
