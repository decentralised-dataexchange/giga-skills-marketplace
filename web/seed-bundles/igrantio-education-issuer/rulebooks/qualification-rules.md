# National qualification framework rules (sandbox rulebook)

These rules MUST be enforced before a credential offer is created. They are
policy, kept separate from the wallet provider APIs so a country can localise
them without touching the integration code.

## R1 - Issuer authorisation
Only institutions registered and authorised in the Education Service Registry
may request issuance. The issuing institution id must appear in the registry
with role "issuer" for the given qualification code.

## R2 - Qualification codes
credentialSubject.achievement.qualificationCode must exist in the national
qualification framework table. Unknown codes are rejected, not defaulted.

## R3 - Dual signature
Diplomas and transcripts are signed by BOTH the institution and the Ministry
of Education. An offer without both signing parties configured must fail.

## R4 - Guardian consent for minors
If the learner is under 18, an active guardian consent record (ISO/IEC 27560)
must exist before issuance. Reference the consent receipt id in the audit log.

## R5 - Revocation
Revocation must update the status list within 24 hours and the National
Certificate Registry entry must reflect the revoked state. Verifiers check
revocation status on every presentation.

## R6 - Payment gate (where applicable)
Where a national fee applies, issuance is gated on a proof-of-payment
reference. In the sandbox this is a simulated proof-of-payment workflow.

## R7 - Audit evidence
Every issuance, revocation, and validation decision is logged with actor,
timestamp, consent reference, and outcome.
