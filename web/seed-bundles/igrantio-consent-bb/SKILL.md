---
name: igrantio-consent-bb
description: >
  Capture, enforce, and revoke learner-data consent using an ISO/IEC 27560
  aligned Consent Building Block API. Use when an application must obtain
  explicit consent before registering a learner or sharing credential data.
version: 1.2.0
provider: iGrant.io (LCubed AB)
targets:
  api: https://docs.igrant.io/docs/category/consent-management-admin-api
  openapi: ./openapi/consent.yaml
  protocols: [ISO-IEC-27560, Consent-BB]
depends_on:
  schemas: [./schemas/consent-record.schema.json]
  rulebooks: [./rulebooks/consent-rules.md]
auth: API key (X-API-Key header)
license: Apache-2.0
---

# Manage learner consent (Consent BB API)

## When to use
Use this skill whenever learner data is collected, stored, or shared:
registration into the NLR, credential issuance for minors, and every
presentation to a relying party.

## Steps
1. Create (or reuse) a data agreement describing purpose, data fields,
   retention, and lawful basis: POST /consent/data-agreements.
2. Ask the individual to sign: POST /consent/records with the agreement id
   and the individual's id. Show the exact fields being consented to.
3. Enforce: before any data exchange, GET /consent/records/{id}/status and
   proceed only if status is "active".
4. Support revocation: DELETE /consent/records/{id} and honour it
   immediately in the application.
5. Store the consent receipt reference in your audit log.

## Validation / done criteria
- No data leaves the application without an active consent record.
- Revocation takes effect immediately and is visible in the audit trail.
