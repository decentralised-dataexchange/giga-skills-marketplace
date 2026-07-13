---
type: usecase
name: national-learner-registry
title: National Learner Registry & Digital Credentials
description: >
  End-to-end education use case: register a learner into the National Learner
  Registry, issue a diploma as a Verifiable Credential, store it in a wallet, and
  verify it with a relying party - built on the iGrant.io Organisation Wallet
  Suite. A journey-tagged prompt chain that composes published skills; install it
  into your own AI coding agent to build an example National Learner Registry app.
version: 1.1.0
provider: iGrant.io (LCubed AB)
license: Apache-2.0
uses_skills: [igrantio-education-issuer, igrantio-education-verifier, igrantio-consent-bb]
prerequisites:
  - An iGrant.io Organisation Wallet Suite (OWS) account with an organisation API key (use demo-api.igrant.io for demo or staging-api.igrant.io for staging).
  - Data agreements defined in the OWS for the learner data collected and shared (registration, issuance, verification).
  - A credential definition configured for the diploma / education credential to be issued - yields the credentialDefinitionId used during issuance.
  - Presentation definitions (DCQL queries) configured for the verification requests - yields the presentationDefinitionId used during verification.
  - Webhooks configured in the OWS so issuance and verification events reach your backend (which then notifies the browser over SSE).
  - The API key is held only by your backend and never exposed to the browser; the learner or guardian possesses a national digital identity.
  - Your own AI coding agent (Claude Code, Codex, opencode, or Pi) is installed with the referenced skills.
journeys:
  - tag: J1
    title: Register learner into the NLR
    description: Onboard the learner as a consent individual, capture consent against the registration data agreement, validate civil-registry data, and create the learner profile with a Unique Learner Identifier (ULID).
    prompts:
      - skills: [igrantio-consent-bb, igrantio-education-issuer]
        prompt: >
          Build the learner-registration step of an example National Learner Registry
          app. Using <skill:igrantio-consent-bb> and <skill:igrantio-education-issuer>:
          (1) authenticate the learner or guardian via the national IdP; (2) create the
          learner as a consent-management individual and store the returned individualId
          mapped to your app's userId in your database; (3) capture ISO/IEC 27560 consent
          for the registration data agreement (dataAgreementId) by recording optIn=true
          against that individual; (4) validate civil-registry data and create the NLR
          profile, returning a ULID. Keep the OWS API key on your backend only - never in
          the browser.
    done: Learner onboarded as an individual (userId to individualId mapped), consent recorded and revocable, NLR profile created with a ULID.
  - tag: J2
    title: Issue a diploma as a Verifiable Credential
    description: Validate academic completion and issue an SD-JWT VC over OpenID4VCI, confirming issuance over SSE.
    prompts:
      - skills: [igrantio-education-issuer]
        prompt: >
          Build the diploma-issuance step. Using <skill:igrantio-education-issuer>: submit
          an issuance request to the OWS issuer API through your backend proxy
          (Authorization: ApiKey), passing the diploma credentialDefinitionId and claims
          (learner name, ULID, programme, grades); read credentialHistory.credentialOffer
          from the response and render it as a QR code and same-device deep link; open an
          SSE stream on credentialHistory.CredentialExchangeId and mark the credential
          issued when the webhook reports credential_accepted or token_issued; register the
          credential in the Certificate Registry.
    done: SD-JWT VC issued over OpenID4VCI, offer QR shown, issuance confirmed via SSE, credential registered.
  - tag: J3
    title: Download and store the credential in a wallet
    description: Track issuance status for the exchange and expose the stored credential's verification tools, linked to the ULID.
    prompts:
      - skills: [igrantio-education-issuer]
        prompt: >
          Using <skill:igrantio-education-issuer>, build the wallet-storage and status
          step. After the learner scans the offer QR, read the OWS credential history for
          the CredentialExchangeId (via your backend proxy) to show issuance status; expose
          the credential's QR, signature chain, and revocation status; and link the stored
          credential to the learner's ULID.
    done: Credential present in the learner's wallet with verification metadata, linked to the ULID.
  - tag: J4
    title: Share and verify with a relying party
    description: Present a selectively disclosed credential to a verifier over OpenID4VP/DCQL after explicit consent, and gate enrolment on the verified result.
    prompts:
      - skills: [igrantio-education-verifier, igrantio-consent-bb]
        prompt: >
          Build the verification step of the example NLR app. Using
          <skill:igrantio-education-verifier> and <skill:igrantio-consent-bb>: capture
          explicit consent for the requested fields; send a DCQL verification request to
          the OWS verifier API through your backend proxy with the diploma
          presentationDefinitionId; read verificationHistory.vpTokenQrCode and render it as
          a QR code or same-device Digital Credentials API request; open an SSE stream on
          presentationExchangeId and, when the wallet responds, read
          data.presentation.verified and data.presentation.presentation[0]; accept
          enrolment only when verified === true.
    done: Verifier accepts a selectively disclosed SD-JWT VC over OpenID4VP/DCQL after consent; enrolment is gated on verified === true.
---

# National Learner Registry & Digital Credentials

## What this use case delivers
A working reference for the four service journeys of the NLR & Digital Credential
ecosystem, composed from published skills and built on the iGrant.io Organisation
Wallet Suite. Install it into your own AI coding agent and run each journey in
order to scaffold an example National Learner Registry application; later journeys
consume earlier outputs (J2 uses the ULID from J1; J4 verifies the credential from J2).

## Before you start
Confirm the prerequisites: an OWS account and API key, defined data agreements,
a credential definition (for J2) and presentation definitions / DCQL queries (for
J4), and webhooks pointing at your backend. The API key stays server-side; the
browser talks only to your backend, which proxies to the OWS and pushes live
status over SSE.

## How to run
1. Install the referenced skills listed in `uses_skills`.
2. Execute journeys J1 to J4 in order, feeding each journey's output into the next.
3. Validate each journey against its `done` criterion before proceeding.
