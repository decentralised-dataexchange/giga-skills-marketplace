# Trust framework and verification rules (sandbox rulebook)

## T1 - Data minimisation
The DCQL query must request only the claims the stated purpose needs.
A request for full date of birth where an age-over check suffices is rejected.

## T2 - Trusted issuer list
issuerSignature is only "valid" if the issuer resolves against the national
trust list (Trust Anchor API). Unknown issuers yield "untrusted_issuer".

## T3 - Revocation check
Every verification MUST check revocation status; cached results older than
24 hours are not acceptable.

## T4 - Consent logging
The learner's consent decision (grant or deny) is logged with the purpose,
the requested claims, and a consent receipt reference.

## T5 - No issuer callback
Verification must complete without contacting the issuing institution.
