---
type: usecase
name: national-learner-registry
title: National Learner Registry & Digital Credentials
description: >
  End-to-end education use case: register a learner into the National Learner
  Registry, issue a diploma as a Verifiable Credential, store it in a wallet, and
  verify it with a relying party. A journey-tagged prompt chain that composes
  published skills; install it into your own AI coding agent to build the flow.
version: 1.0.0
provider: GovStack Trust Services
license: Apache-2.0
uses_skills: [igrantio-education-issuer, igrantio-education-verifier, govstack-consent-bb]
prerequisites:
  - The learner or guardian possesses a national digital identity.
  - Educational institutions are registered and authorised in the Education Service Registry.
  - The platform is integrated with the relevant DPI building blocks (digital identity and authentication, document verification, consent management, digital signature, trust services, and payment services where applicable).
  - A sandbox account and API keys have been obtained from the wallet solution provider.
  - Your own AI coding agent (Claude Code, Codex, opencode, Cursor, or Pi) is installed with the referenced skills.
journeys:
  - tag: J1
    title: Register learner into the NLR
    description: Authenticate the learner or guardian, capture consent, validate civil-registry data, and create the learner profile with a Unique Learner Identifier (ULID).
    skills: [govstack-consent-bb, igrantio-education-issuer]
    prompts:
      - >
        Using the consent and issuer skills, scaffold learner registration:
        authenticate via the national IdP, capture ISO/IEC 27560 consent, validate
        civil-registry data, run the school-to-ministry approval workflow, and
        create the NLR profile returning a ULID.
    done: Learner profile created with a ULID; consent recorded and revocable.
  - tag: J2
    title: Issue a diploma as a Verifiable Credential
    description: Validate academic completion and issue an SD-JWT VC over OpenID4VCI, dual-signed by institution and Ministry of Education.
    skills: [igrantio-education-issuer]
    prompts:
      - >
        Using the issuer skill, submit a signed issuance request with the learner
        ULID, programme and grades; verify completion against the national
        qualification framework; issue an SD-JWT VC over OpenID4VCI and register it
        in the Certificate Registry.
    done: SD-JWT VC issued over OpenID4VCI and registered in the Certificate Registry.
  - tag: J3
    title: Download and store the credential in a wallet
    description: Retrieve active credentials and add them to the learner's wallet with verification tools.
    skills: [igrantio-education-issuer]
    prompts:
      - >
        Authenticate the learner, retrieve active credentials from the Certificate
        Registry, and add them to the wallet as SD-JWT VC objects linked to the
        ULID, exposing a QR code, signature chain, and revocation status.
    done: Credential present in the wallet with verification tools.
  - tag: J4
    title: Share and verify with a relying party
    description: Present a selectively disclosed credential to a verifier over OpenID4VP/DCQL, after explicit consent.
    skills: [igrantio-education-verifier, govstack-consent-bb]
    prompts:
      - >
        Using the verifier and consent skills, request a presentation over
        OpenID4VP/DCQL, capture explicit consent for the requested fields, and
        verify authenticity, integrity, issuer signature, and revocation without
        contacting the issuer.
    done: Verifier accepts a selectively disclosed SD-JWT VC after consent is granted.
---

# National Learner Registry & Digital Credentials

## What this use case delivers
A working reference for the four service journeys of the NLR & Digital Credential
ecosystem, composed from published skills. Install it into your own AI coding
agent and run each journey in order; later journeys consume earlier outputs
(J2 uses the ULID from J1).

## How to run
1. Install the referenced skills listed in `uses_skills`.
2. Execute journeys J1 to J4 in order, feeding each journey's output into the next.
3. Validate each journey against its `done` criterion before proceeding.
